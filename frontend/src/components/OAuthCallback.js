import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    let hasProcessed = false; // Prevent multiple calls

    const handleCallback = async () => {
      if (hasProcessed) return;
      hasProcessed = true;

      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + encodeURIComponent('OAuth authorization failed'));
        return;
      }

      if (!code) {
        navigate('/login?error=' + encodeURIComponent('No authorization code received'));
        return;
      }

      try {
        // Exchange code for token on the backend
        const response = await fetch('/auth/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ code, state }),
        });

        const data = await response.json();

        if (data.success) {
          // Clear the URL parameters to prevent reuse
          window.history.replaceState({}, document.title, '/dashboard');
          // Redirect to dashboard on success
          navigate('/dashboard');
        } else {
          navigate('/login?error=' + encodeURIComponent(data.error || 'Authentication failed'));
        }
      } catch (err) {
        console.error('Callback error:', err);
        navigate('/login?error=' + encodeURIComponent('Authentication failed'));
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <CircularProgress size={60} sx={{ mb: 3 }} />
      <Typography variant="h6" gutterBottom>
        Completing sign-in...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please wait while we verify your Google account.
      </Typography>
    </Box>
  );
};

export default OAuthCallback; 