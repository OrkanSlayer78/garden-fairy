import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// Components
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OAuthCallback from './components/OAuthCallback';
import Plants from './components/Plants';
import GardenAnalyzer from './components/GardenAnalyzer';
import GardenLayoutFixed from './components/GardenLayoutFixed';
import PlantManagementDashboard from './components/PlantManagementDashboard';
import SmartGardenCalendar from './components/SmartGardenCalendar';

// Placeholder components for other routes
const Analytics = () => <div>Analytics component will be implemented here</div>;

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route wrapper (redirects authenticated users)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/callback"
        element={<OAuthCallback />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="plants" element={<Plants />} />
        <Route path="manage" element={<PlantManagementDashboard />} />
        <Route path="garden" element={<GardenLayoutFixed />} />
        <Route path="garden-analyzer" element={<GardenAnalyzer />} />
        <Route path="calendar" element={<SmartGardenCalendar />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App; 