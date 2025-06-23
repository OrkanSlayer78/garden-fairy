import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogle, isAuthenticated, loading } = useAuth();
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Check for error in URL params
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleGoogleResponse = useCallback(async (response) => {
    setLoggingIn(true);
    setError('');

    try {
      const result = await loginWithGoogle(response.credential);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    // Initialize Google Sign-In
    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // Disable FedCM to avoid COOP issues
        });
        
        // Render the button
        if (document.getElementById('google-signin-button')) {
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'continue_with',
              logo_alignment: 'left',
              width: 400
            }
          );
        }
      } else {
        // Retry after a short delay
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    // Wait for the DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeGoogleSignIn);
    } else {
      initializeGoogleSignIn();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeGoogleSignIn);
    };
  }, [handleGoogleResponse]);

  const handleGoogleLogin = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setError('Google Sign-In popup was blocked or skipped. Please use the direct OAuth method below.');
        }
      });
    } else {
      setError('Google Sign-In not loaded. Please refresh the page.');
    }
  };

  const handleDirectOAuth = () => {
    // Direct OAuth flow as fallback
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${Date.now()}`; // Add state to prevent code reuse
    
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        py={4}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
          }}
        >
          {/* App Logo/Title */}
          <Box mb={3}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              🌱 Garden Fairy
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              gutterBottom
            >
              Plan and manage your garden with ease
            </Typography>
          </Box>

          {/* Features List */}
          <Box mb={4} textAlign="left">
            <Typography variant="body1" paragraph>
              ✨ <strong>Features:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • 🌱 Plan your garden layout
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • 📅 Track planting schedules
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • 🌿 Manage plant information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • 📊 View garden analytics
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Google Login Button */}
          <Box sx={{ mb: 2 }}>
            <div id="google-signin-button" style={{ width: '100%' }}></div>
          </Box>

          {/* Fallback Manual Button */}
          <Button
            variant="outlined"
            size="large"
            startIcon={loggingIn ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loggingIn}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              borderColor: '#4285f4',
              color: '#4285f4',
              mb: 2,
              '&:hover': {
                borderColor: '#357ae8',
                backgroundColor: 'rgba(66, 133, 244, 0.04)',
              },
            }}
            fullWidth
          >
            {loggingIn ? 'Signing in...' : 'Try Alternative Sign-In'}
          </Button>

          {/* Direct OAuth Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleDirectOAuth}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              backgroundColor: '#4285f4',
              '&:hover': {
                backgroundColor: '#357ae8',
              },
            }}
            fullWidth
          >
            Direct Google OAuth
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={2}
          >
            Secure authentication powered by Google
          </Typography>
        </Paper>

        {/* Footer */}
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          mt={3}
        >
          © 2024 Garden Fairy. Made with 💚 for gardeners everywhere.
        </Typography>
      </Box>
    </Container>
  );
};

export default Login; 