import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';

const GardenLayoutSimple = () => {
  const [loading, setLoading] = useState(false);

  return (
    <Box className="fade-in">
      <Typography variant="h4" component="h1" gutterBottom>
        Garden Layout Designer 🗺️
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Design your perfect garden with GPS location, intelligent plot planning, and plant journaling
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Garden Layout system is loading... Let's test the basic setup first!
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Step 1: Test Basic Functionality
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            If you can see this message, the basic React component is working.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => {
              setLoading(!loading);
              console.log('Garden Layout test button clicked');
            }}
          >
            {loading ? 'Loading...' : 'Test Button'}
          </Button>
        </CardContent>
      </Card>

      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Coming Features:
        </Typography>
        <ul>
          <li>📍 GPS Location Selection</li>
          <li>🌦️ Environmental Data Integration</li>
          <li>🎨 Interactive Plot Drawing</li>
          <li>🌱 Drag & Drop Plant Placement</li>
          <li>📔 Plant Journaling System</li>
          <li>👥 Community Garden Features</li>
        </ul>
      </Box>
    </Box>
  );
};

export default GardenLayoutSimple; 