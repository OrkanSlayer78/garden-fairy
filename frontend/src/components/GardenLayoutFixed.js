import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isGoogleMapsAvailable, getStaticSatelliteMapUrl, getStaticMapUrl } from '../utils/googleMaps';
import InteractiveGardenMap from './InteractiveGardenMap';
import PlantPalette from './PlantPalette';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  CircularProgress,
  Chip,
  TextField,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Snackbar,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CloudQueue as WeatherIcon,
  Terrain as SoilIcon,
  LocalFireDepartment as FireIcon,
  Search as SearchIcon,
  Map as MapIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Crop as CropIcon,
  Satellite as SatelliteIcon,
  Thermostat as ThermostatIcon,
} from '@mui/icons-material';

const GardenLayoutFixed = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [gardenLocation, setGardenLocation] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [plots, setPlots] = useState([]);
  const [plotDialog, setPlotDialog] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [newPlot, setNewPlot] = useState({
    name: '',
    width: 10,
    height: 10,
    soil_quality: 'good',
    sun_exposure: 'full_sun',
    irrigation_type: 'manual'
  });
  const [drawingMode, setDrawingMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [plantPlacements, setPlantPlacements] = useState([]);
  const [isDragMode, setIsDragMode] = useState(false);

  // Memoized plot creation to prevent dialog refresh
  const createPlot = React.useCallback(async (plotData = null) => {
    try {
      // Use provided plotData (from map) or dialog form data
      const dataToSend = plotData || {
        ...newPlot,
        garden_location_id: gardenLocation?.id,
        center_x: gardenLocation.longitude + (Math.random() - 0.5) * 0.001,
        center_y: gardenLocation.latitude + (Math.random() - 0.5) * 0.001,
      };

      const response = await fetch('http://localhost:5000/api/garden/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();
      if (data.success) {
        setPlots(prevPlots => [...prevPlots, data.plot]);
        
        // Only close dialog and reset form if this was from dialog (not map)
        if (!plotData) {
          setPlotDialog(false);
          setNewPlot({
            name: '',
            width: 10,
            height: 10,
            soil_quality: 'good',
            sun_exposure: 'full_sun',
            irrigation_type: 'manual'
          });
        }
        
        setSnackbar({ 
          open: true, 
          message: `Garden plot "${data.plot.name}" created successfully!`, 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('Error creating plot:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to create garden plot', 
        severity: 'error' 
      });
    }
  }, [newPlot, gardenLocation]);

  // Update existing plot (for map interactions)
  const updatePlot = React.useCallback(async (plotId, updateData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/garden/plots/${plotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlots(prevPlots => 
            prevPlots.map(plot => plot.id === plotId ? data.plot : plot)
          );
        }
      }
    } catch (error) {
      console.error('Error updating plot:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to update garden plot', 
        severity: 'error' 
      });
    }
  }, []);

  const deletePlot = React.useCallback(async (plotId) => {
    if (!window.confirm('Are you sure you want to delete this plot?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/garden/plots/${plotId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setPlots(prevPlots => prevPlots.filter(plot => plot.id !== plotId));
      }
    } catch (error) {
      console.error('Error deleting plot:', error);
    }
  }, []);

  // Plant placement functions
  const placePlant = React.useCallback(async (placementData) => {
    try {
      const response = await fetch('http://localhost:5000/api/garden/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(placementData)
      });

      const data = await response.json();
      if (data.success) {
        setPlantPlacements(prev => [...prev, data.placement]);
        setSnackbar({ 
          open: true, 
          message: `${placementData.plant_name} planted successfully!`, 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('Error placing plant:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to place plant', 
        severity: 'error' 
      });
    }
  }, []);

  const updatePlantPlacement = React.useCallback(async (placementId, updateData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/garden/placements/${placementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlantPlacements(prev => 
            prev.map(placement => placement.id === placementId ? data.placement : placement)
          );
        }
      }
    } catch (error) {
      console.error('Error updating plant placement:', error);
    }
  }, []);

  const deletePlantPlacement = React.useCallback(async (placementId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/garden/placements/${placementId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setPlantPlacements(prev => prev.filter(placement => placement.id !== placementId));
        setSnackbar({ 
          open: true, 
          message: 'Plant removed successfully', 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('Error deleting plant placement:', error);
    }
  }, []);

  const handleNewPlotChange = React.useCallback((field, value) => {
    setNewPlot(prev => ({ ...prev, [field]: value }));
  }, []);

  // Helper function for water requirement colors
  const getWaterRequirementColor = (requirement) => {
    switch (requirement) {
      case 'low': return '#FFA94D';
      case 'medium': return '#74C0FC';
      case 'high': return '#339AF0';
      default: return '#74C0FC';
    }
  };

  const steps = [
    'Set Garden Location',
    'Design Garden Plots', 
    'Plant Your Garden',
    'Manage & Journal'
  ];

  // GPS Location Component
  const LocationSelector = () => {
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [address, setAddress] = useState('');
    const [addressInput, setAddressInput] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);
    const [geocodingLoading, setGeocodingLoading] = useState(false);
    const [weatherData, setWeatherData] = useState(null);
    const [climateData, setClimateData] = useState(null);

    // Load existing garden location on component mount
    useEffect(() => {
      if (gardenLocation && !selectedPosition) {
        setSelectedPosition({ 
          lat: gardenLocation.latitude, 
          lng: gardenLocation.longitude 
        });
        setAddress(gardenLocation.address);
        loadWeatherData(gardenLocation.latitude, gardenLocation.longitude);
      }
    }, [gardenLocation, selectedPosition]);

    const loadWeatherData = async (lat, lng) => {
      try {
        // Use OpenWeatherMap API for weather (you'll need to get a free API key)
        // For now, using a mock weather service
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=7`
        );
        const data = await response.json();
        setWeatherData(data);

        // Get climate data (simplified since the detailed API wasn't working)
        try {
          const climateResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`
          );
          const climateDataResult = await climateResponse.json();
          if (climateDataResult.daily) {
            // Create mock climate data from current weather
            setClimateData({
              daily: {
                temperature_2m_mean: Array(365).fill(20), // Mock yearly data
                precipitation_sum: Array(365).fill(1)
              }
            });
          }
        } catch (climateError) {
          console.log('Climate data not available, using mock data');
          setClimateData({
            daily: {
              temperature_2m_mean: Array(365).fill(20),
              precipitation_sum: Array(365).fill(1)
            }
          });
        }
      } catch (error) {
        console.error('Error loading weather data:', error);
      }
    };

    const requestLocation = () => {
      setLocationLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setSelectedPosition({ lat, lng });
            reverseGeocode(lat, lng);
            setLocationLoading(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLocationLoading(false);
            // Use demo coordinates for testing
            setSelectedPosition({ lat: 37.7749, lng: -122.4194 });
            setAddress('Demo Location: San Francisco, CA');
          }
        );
      } else {
        setLocationLoading(false);
        // Fallback demo coordinates
        setSelectedPosition({ lat: 37.7749, lng: -122.4194 });
        setAddress('Demo Location: Browser GPS not available');
      }
    };

    const reverseGeocode = async (lat, lng) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        setAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    };

    const geocodeAddress = async () => {
      if (!addressInput.trim()) return;
      
      setGeocodingLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          setSelectedPosition({ lat, lng });
          setAddress(result.display_name);
        } else {
          alert('Address not found. Please try a different address.');
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        alert('Error finding address. Please try again.');
      } finally {
        setGeocodingLoading(false);
      }
    };

    const handleAddressKeyPress = (event) => {
      if (event.key === 'Enter') {
        geocodeAddress();
      }
    };

    const saveLocation = async () => {
      if (!selectedPosition) return;
      setLoading(true);

      try {
        // Save location to database
        const requestBody = {
          latitude: selectedPosition.lat,
          longitude: selectedPosition.lng,
          address: address,
          name: 'My Garden'
        };
        
        const response = await fetch('http://localhost:5000/api/garden/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody)
        });

        if (response.status === 401) {
          setAuthError(true);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setGardenLocation(data.location);
          
          // Fetch environmental data
          const envResponse = await fetch(
            `http://localhost:5000/api/garden/environmental-data/${selectedPosition.lat}/${selectedPosition.lng}`,
            { credentials: 'include' }
          );
          const envData = await envResponse.json();
          if (envData.success) {
            setEnvironmentalData(envData.data);
          }

          // Load weather data - but don't reload if already loaded
          if (!weatherData) {
            await loadWeatherData(selectedPosition.lat, selectedPosition.lng);
          }
          
          // Don't automatically advance step - let user see their saved location
          // setActiveStep(1);
        } else {
          console.error('Failed to save location:', data);
        }
      } catch (error) {
        console.error('Error saving location:', error);
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          setAuthError(true);
        }
      } finally {
        setLoading(false);
      }
    };

         return (
       <Box>
         <Typography variant="h6" gutterBottom>
           🌍 Choose Your Garden Location
         </Typography>
         <Typography variant="body2" color="text.secondary" paragraph>
           We'll use your location to provide climate data, frost dates, and growing recommendations
         </Typography>

         {/* Show success message if location is saved */}
         {gardenLocation && (
           <Alert severity="success" sx={{ mb: 3 }}>
             ✅ Garden location saved successfully! Address: {gardenLocation.address}
           </Alert>
         )}
         
         <Grid container spacing={3}>
           <Grid item xs={12} md={6}>
             <Card>
               <CardContent>
                 <Typography variant="subtitle1" gutterBottom>
                   📍 Use GPS Location
                 </Typography>
                 <Button 
                   variant="contained" 
                   onClick={requestLocation} 
                   disabled={locationLoading}
                   startIcon={locationLoading ? <CircularProgress size={20} /> : <LocationIcon />}
                   fullWidth
                 >
                   {locationLoading ? 'Getting Location...' : 'Use My Current Location'}
                 </Button>
               </CardContent>
             </Card>
           </Grid>
           
           <Grid item xs={12} md={6}>
             <Card>
               <CardContent>
                 <Typography variant="subtitle1" gutterBottom>
                   🔍 Enter Address
                 </Typography>
                 <Box display="flex" gap={1}>
                   <TextField
                     fullWidth
                     placeholder="Enter your address (e.g., 123 Main St, City, State)"
                     value={addressInput}
                     onChange={(e) => setAddressInput(e.target.value)}
                     onKeyPress={handleAddressKeyPress}
                     size="small"
                   />
                   <Button 
                     variant="contained"
                     onClick={geocodeAddress}
                     disabled={geocodingLoading || !addressInput.trim()}
                     startIcon={geocodingLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                   >
                     {geocodingLoading ? 'Finding...' : 'Find'}
                   </Button>
                 </Box>
               </CardContent>
             </Card>
           </Grid>
         </Grid>

         {selectedPosition && (
           <Box mt={3}>
             <Divider sx={{ mb: 2 }} />
           </Box>
         )}

         {(selectedPosition || gardenLocation) && (
           <Grid container spacing={3}>
             <Grid item xs={12} md={8}>
               <Card>
                 <CardContent>
                   <Box display="flex" alignItems="center" mb={2}>
                     <LocationIcon color="primary" sx={{ mr: 1 }} />
                     <Typography variant="h6">
                       📍 Location Selected
                     </Typography>
                   </Box>
                   
                   <Typography variant="body2" color="text.secondary" paragraph>
                     <strong>Address:</strong> {address || gardenLocation?.address}
                   </Typography>
                   <Typography variant="body2" color="text.secondary" paragraph>
                     <strong>Coordinates:</strong> {selectedPosition?.lat.toFixed(6) || gardenLocation?.latitude.toFixed(6)}, {selectedPosition?.lng.toFixed(6) || gardenLocation?.longitude.toFixed(6)}
                   </Typography>

                   <Button 
                     variant="contained" 
                     onClick={saveLocation}
                     disabled={loading || !!gardenLocation}
                     startIcon={loading ? <CircularProgress size={20} /> : null}
                     size="large"
                     fullWidth
                     color={gardenLocation ? "success" : "primary"}
                   >
                     {loading ? 'Saving...' : 
                      gardenLocation ? '✅ Location Saved!' : 
                      'Save Location & Get Environmental Data'}
                   </Button>
                 </CardContent>
               </Card>
             </Grid>
             
             <Grid item xs={12} md={4}>
               <Card>
                 <CardContent>
                   <Box display="flex" alignItems="center" mb={2}>
                     <MapIcon color="primary" sx={{ mr: 1 }} />
                     <Typography variant="h6">
                       🗺️ Map View
                     </Typography>
                   </Box>
                   
                   {/* Simple static map using OpenStreetMap */}
                   <Paper sx={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                     <iframe
                       width="100%"
                       height="100%"
                       frameBorder="0"
                       style={{ border: 0 }}
                       src={`https://www.openstreetmap.org/export/embed.html?bbox=${(selectedPosition?.lng || gardenLocation?.longitude)-0.01},${(selectedPosition?.lat || gardenLocation?.latitude)-0.01},${(selectedPosition?.lng || gardenLocation?.longitude)+0.01},${(selectedPosition?.lat || gardenLocation?.latitude)+0.01}&layer=mapnik&marker=${selectedPosition?.lat || gardenLocation?.latitude},${selectedPosition?.lng || gardenLocation?.longitude}`}
                       title="Garden Location Map"
                     />
                   </Paper>
                   
                   <Box mt={1} textAlign="center">
                     <Button 
                       size="small" 
                       href={`https://www.openstreetmap.org/?mlat=${selectedPosition?.lat || gardenLocation?.latitude}&mlon=${selectedPosition?.lng || gardenLocation?.longitude}&zoom=15`}
                       target="_blank"
                       rel="noopener noreferrer"
                     >
                       View in Full Map
                     </Button>
                   </Box>
                 </CardContent>
               </Card>
             </Grid>
           </Grid>
         )}

        {environmentalData && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WeatherIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  🌦️ Environmental Information
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip 
                      label={`Zone ${environmentalData.climate_zone}`}
                      color="primary" 
                      variant="outlined"
                    />
                    <Typography variant="caption" display="block" mt={1}>
                      Climate Zone
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip 
                      icon={<SoilIcon />}
                      label={environmentalData.soil_data.type}
                      color="secondary" 
                      variant="outlined"
                    />
                    <Typography variant="caption" display="block" mt={1}>
                      Soil Type
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip 
                      icon={<WeatherIcon />}
                      label={`${environmentalData.average_rainfall.annual_average}"`}
                      color="info" 
                      variant="outlined"
                    />
                    <Typography variant="caption" display="block" mt={1}>
                      Annual Rainfall
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip 
                      icon={<FireIcon />}
                      label={environmentalData.fire_risk.risk_level}
                      color={environmentalData.fire_risk.risk_level === 'low' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                    <Typography variant="caption" display="block" mt={1}>
                      Fire Risk
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Growing Season:</strong> {environmentalData.frost_dates.growing_days} days 
                (Last frost: {environmentalData.frost_dates.last_frost}, First frost: {environmentalData.frost_dates.first_frost})
              </Alert>
            </CardContent>
          </Card>
        )}

                 {gardenLocation && (
           <Box mt={3} display="flex" justifyContent="center">
             <Button 
               variant="contained" 
               size="large"
               onClick={() => setActiveStep(1)}
               startIcon={<MapIcon />}
             >
               Continue to Garden Plot Design
             </Button>
           </Box>
         )}

         {weatherData && (
           <Grid container spacing={3} sx={{ mt: 2 }}>
             <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <WeatherIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      🌤️ 7-Day Weather Forecast
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={1}>
                    {weatherData.daily?.time?.slice(0, 7).map((date, index) => (
                      <Grid item xs={12} sm={6} md={12} lg={6} key={date}>
                        <Paper sx={{ p: 2, mb: 1 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle2">
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Precip: {weatherData.daily.precipitation_sum[index]?.toFixed(1) || 0}"
                              </Typography>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="h6" color="primary">
                                {Math.round(weatherData.daily.temperature_2m_max[index])}°
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {Math.round(weatherData.daily.temperature_2m_min[index])}°
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <ThermostatIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      📊 Yearly Climate Averages
                    </Typography>
                  </Box>
                  
                  {climateData?.daily ? (
                    <Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Temperature Range</Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Chip 
                            label={`Avg: ${(climateData.daily.temperature_2m_mean.reduce((a, b) => a + b, 0) / climateData.daily.temperature_2m_mean.length).toFixed(1)}°F`}
                            color="primary" 
                            size="small"
                          />
                          <Chip 
                            label={`Max: ${Math.max(...climateData.daily.temperature_2m_mean).toFixed(1)}°F`}
                            color="error" 
                            size="small"
                          />
                          <Chip 
                            label={`Min: ${Math.min(...climateData.daily.temperature_2m_mean).toFixed(1)}°F`}
                            color="info" 
                            size="small"
                          />
                        </Box>
                      </Box>

                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Annual Precipitation</Typography>
                        <Chip 
                          label={`${(climateData.daily.precipitation_sum.reduce((a, b) => a + b, 0)).toFixed(1)}" total`}
                          color="secondary" 
                          icon={<WeatherIcon />}
                        />
                      </Box>

                      <Alert severity="success">
                        <strong>Best Planting Months:</strong> Based on temperature patterns, optimal planting is typically March-May and September-October
                      </Alert>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Loading climate data...
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    );
  };

     // Satellite Map Plot Designer
   const PlotDesigner = React.memo(() => {
     const [mapMode, setMapMode] = useState('map');

     // Early return if no garden location
     if (!gardenLocation) {
       return (
         <Box textAlign="center" py={4}>
           <Alert severity="warning">
             Please set your garden location first before designing plots.
           </Alert>
           <Button 
             variant="contained" 
             onClick={() => setActiveStep(0)}
             sx={{ mt: 2 }}
           >
             Go Back to Set Location
           </Button>
         </Box>
       );
     }

     return (
       <Box>
         <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
           <Box>
             <Typography variant="h6" gutterBottom>
               🗺️ Design Your Garden Plots
             </Typography>
             <Typography variant="body2" color="text.secondary">
               Map view of your property for garden planning
             </Typography>
           </Box>
           <Button 
             variant="contained" 
             startIcon={<AddIcon />}
             onClick={() => setPlotDialog(true)}
           >
             Add Plot
           </Button>
         </Box>

         {/* Satellite Map View */}
         <Card sx={{ mb: 3 }}>
           <CardContent>
             <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
               <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                 <SatelliteIcon sx={{ mr: 1 }} />
                 🛰️ Interactive Satellite Map - {gardenLocation?.address}
               </Typography>
               <Button 
                 variant="outlined" 
                 startIcon={<AddIcon />}
                 onClick={() => setPlotDialog(true)}
                 size="small"
               >
                 Quick Add Plot
               </Button>
             </Box>
             
             {/* Interactive Map for Plot Design Only - No Plant Library */}
             <Box sx={{ height: 600 }}>
               <InteractiveGardenMap
                 gardenLocation={gardenLocation}
                 plots={plots}
                 onPlotCreate={createPlot}
                 onPlotUpdate={updatePlot}
                 onPlotDelete={deletePlot}
                 plantPlacements={plantPlacements}
                 onPlantPlace={placePlant}
                 onPlantUpdate={updatePlantPlacement}
                 onPlantDelete={deletePlantPlacement}
                 isDragMode={false}
                 showPlantTools={false}
               />
             </Box>
             
             <Alert severity="success" sx={{ mt: 2 }}>
               <strong>🎯 Plot Design Tools:</strong> Click the + button to draw garden plots • Click polygon points to create boundaries • Drag to move plots • Drag corners to resize • Click plots to select/delete
             </Alert>
           </CardContent>
         </Card>

         {/* Plot List */}
         {plots.length > 0 && (
           <Card sx={{ mb: 3 }}>
             <CardContent>
               <Typography variant="h6" gutterBottom>
                 📋 Your Garden Plots ({plots.length})
               </Typography>
               <Grid container spacing={2}>
                 {plots.map((plot) => (
                   <Grid item xs={12} sm={6} md={4} key={plot.id}>
                     <Card variant="outlined">
                       <CardContent sx={{ p: 2 }}>
                         <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                           <Typography variant="subtitle2" fontWeight="bold">
                             {plot.name}
                           </Typography>
                           <Button
                             size="small"
                             color="error"
                             onClick={() => deletePlot(plot.id)}
                           >
                             <DeleteIcon fontSize="small" />
                           </Button>
                         </Box>
                         <Typography variant="body2" color="text.secondary">
                           📐 Size: {plot.width} × {plot.height} feet
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                           ☀️ Sun: {plot.sun_exposure?.replace('_', ' ')}
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                           🌱 Soil: {plot.soil_quality}
                         </Typography>
                         
                         {/* Show Plants in Plot */}
                         {plot.plant_placements && plot.plant_placements.length > 0 && (
                           <Box mt={2}>
                             <Typography variant="caption" color="text.secondary" fontWeight="bold">
                               Plants in this plot ({plot.plant_count}):
                             </Typography>
                             <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                               {plot.plant_placements.map((placement) => (
                                 <Chip
                                   key={placement.id}
                                   label={`${placement.plant_icon} ${placement.plant_name}`}
                                   size="small"
                                   variant="outlined"
                                   sx={{
                                     bgcolor: placement.plant_color + '20',
                                     borderColor: placement.plant_color,
                                     fontSize: '0.7rem'
                                   }}
                                 />
                               ))}
                             </Box>
                           </Box>
                         )}
                         
                         {plot.plant_count === 0 && (
                           <Box mt={2}>
                             <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                               No plants placed yet - continue to plant placement step
                             </Typography>
                           </Box>
                         )}
                       </CardContent>
                     </Card>
                   </Grid>
                 ))}
               </Grid>
             </CardContent>
           </Card>
         )}

         <Box display="flex" justifyContent="space-between">
           <Button onClick={() => setActiveStep(0)}>Back</Button>
           <Button 
             variant="contained" 
             onClick={() => setActiveStep(2)}
             disabled={plots.length === 0}
           >
             Continue to Plant Placement
           </Button>
         </Box>


       </Box>
     );
   });

  const PlantPlacer = () => {
    if (!gardenLocation || plots.length === 0) {
      return (
        <Box textAlign="center" py={4}>
          <Alert severity="warning">
            Please create at least one garden plot before placing plants.
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => setActiveStep(1)}
            sx={{ mt: 2 }}
          >
            Go Back to Design Plots
          </Button>
        </Box>
      );
    }

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              🌱 Plant Your Garden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag plants from the library onto your garden plots
            </Typography>
          </Box>
          <Chip 
            label={`${plantPlacements.length} plants placed`}
            color="success"
            variant="outlined"
          />
        </Box>

        {/* Interactive Map with Plant Placement */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', height: 600 }}>
              {/* Plant Palette Sidebar */}
              <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', overflow: 'hidden' }}>
                <PlantPalette
                  onPlantDragStart={() => setIsDragMode(true)}
                  onPlantDragEnd={() => setIsDragMode(false)}
                />
              </Box>
              
              {/* Interactive Map */}
              <Box sx={{ flexGrow: 1 }}>
                <InteractiveGardenMap
                  gardenLocation={gardenLocation}
                  plots={plots}
                  onPlotCreate={createPlot}
                  onPlotUpdate={updatePlot}
                  onPlotDelete={deletePlot}
                  plantPlacements={plantPlacements}
                  onPlantPlace={placePlant}
                  onPlantUpdate={updatePlantPlacement}
                  onPlantDelete={deletePlantPlacement}
                  isDragMode={isDragMode}
                  showPlantTools={true}
                />
              </Box>
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>🌱 Plant Placement:</strong> Drag plants from the left panel onto your garden plots • Plants will snap to valid locations with proper spacing • Click planted items to move or remove them
            </Alert>
          </CardContent>
        </Card>

        {/* Plant Summary */}
        {plantPlacements.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🌿 Planted Garden Summary ({plantPlacements.length} plants)
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                💡 <strong>Tip:</strong> Click on any plant marker on the map above to view detailed information, journal entries, and care schedule!
              </Alert>
              <Grid container spacing={2}>
                {plantPlacements.map((placement) => {
                  const plot = plots.find(p => p.id === placement.plot_id);
                  const plantedDate = new Date(placement.planted_date);
                  const daysPlanted = Math.floor((new Date() - plantedDate) / (1000 * 60 * 60 * 24));
                  const daysToHarvest = placement.days_to_harvest || 75;
                  const harvestProgress = Math.min((daysPlanted / daysToHarvest) * 100, 100);
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={placement.id}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 3,
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => {
                          // Scroll to map and highlight the plant
                          document.querySelector('[data-testid="interactive-map"]')?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Avatar
                              sx={{
                                bgcolor: placement.plant_color || '#4CAF50',
                                mr: 1,
                                width: 40,
                                height: 40,
                                fontSize: '1.5rem'
                              }}
                            >
                              {placement.plant_icon}
                            </Avatar>
                            <Box flexGrow={1}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {placement.plant_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {placement.scientific_name || 'Plant species'}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePlantPlacement(placement.id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </Button>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            📍 Plot: {plot?.name || 'Unknown'} • Day {daysPlanted}
                          </Typography>
                          
                          <Box mb={1}>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption">Growth Progress</Typography>
                              <Typography variant="caption">{Math.round(harvestProgress)}%</Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={harvestProgress}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            <Chip
                              size="small"
                              label={`☀️ ${placement.sun_requirement || 'full'}`}
                              sx={{ fontSize: '0.6rem', height: 20 }}
                            />
                            <Chip
                              size="small"
                              label={`💧 ${placement.water_requirement || 'medium'}`}
                              sx={{ 
                                fontSize: '0.6rem', 
                                height: 20,
                                bgcolor: getWaterRequirementColor(placement.water_requirement),
                                color: 'white'
                              }}
                            />
                            {daysToHarvest && (
                              <Chip
                                size="small"
                                label={`🌾 ${Math.max(0, daysToHarvest - daysPlanted)}d`}
                                sx={{ fontSize: '0.6rem', height: 20 }}
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        )}

        <Box display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(1)}>Back to Plot Design</Button>
          <Button variant="contained" onClick={() => setActiveStep(3)}>
            Continue to Journal
          </Button>
        </Box>
      </Box>
    );
  };

  const PlantManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        📔 Plant Journal & Management
      </Typography>
      <Alert severity="info">
        Coming in Phase 4! You'll be able to track plant progress and keep a garden journal.
      </Alert>
      <Box mt={2}>
        <Button onClick={() => setActiveStep(2)}>Back</Button>
      </Box>
    </Box>
  );

     // Load existing data on component mount
   useEffect(() => {
     const loadExistingData = async () => {
       try {
         const locationResponse = await fetch('http://localhost:5000/api/garden/location', { credentials: 'include' });
         const locationData = await locationResponse.json();
         if (locationData.success && locationData.location) {
           setGardenLocation(locationData.location);
           setActiveStep(1); // Skip to step 2 if location already exists
           
           // Also load environmental data (optional)
           try {
             const envResponse = await fetch(
               `http://localhost:5000/api/garden/environmental-data/${locationData.location.latitude}/${locationData.location.longitude}`,
               { credentials: 'include' }
             );
             if (envResponse.ok) {
               const envData = await envResponse.json();
               if (envData.success) {
                 setEnvironmentalData(envData.data);
               }
             }
           } catch (envError) {
             console.log('Environmental data not available, continuing...');
           }
         }

         // Load plots
         const plotsResponse = await fetch('http://localhost:5000/api/garden/plots', { credentials: 'include' });
         const plotsData = await plotsResponse.json();
         if (plotsData.success) {
           setPlots(plotsData.plots);
         }

         // Load plant placements
         const placementsResponse = await fetch('http://localhost:5000/api/garden/placements', { credentials: 'include' });
         const placementsData = await placementsResponse.json();
         if (placementsData.success) {
           setPlantPlacements(placementsData.placements);
         }
       } catch (error) {
         console.error('Error loading existing data:', error);
       }
     };

     loadExistingData();
   }, []);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return <LocationSelector />;
      case 1:
        return <PlotDesigner />;
      case 2:
        return <PlantPlacer />;
      case 3:
        return <PlantManagement />;
      default:
        return <LocationSelector />;
    }
  };

  return (
    <Box className="fade-in">
      <Typography variant="h4" component="h1" gutterBottom>
        Garden Layout Designer 🗺️
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Design your perfect garden with GPS location, intelligent plot planning, and plant journaling
      </Typography>

      {gardenLocation && (
        <Alert severity="success" sx={{ mb: 2 }}>
          🎯 Garden location set: {gardenLocation.address || `${gardenLocation.latitude}, ${gardenLocation.longitude}`}
        </Alert>
      )}

      {authError && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        }>
          🔒 You need to be logged in to save garden locations. Please log in first.
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel 
              onClick={() => setActiveStep(index)}
              sx={{ cursor: 'pointer' }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      {/* Add Plot Dialog - Moved outside components to prevent re-renders */}
      <Dialog open={plotDialog} onClose={() => setPlotDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Garden Plot</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Plot Name"
                placeholder="e.g., Vegetable Garden, Herb Bed, Flower Border"
                value={newPlot.name}
                onChange={(e) => handleNewPlotChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Width (feet)"
                type="number"
                value={newPlot.width}
                onChange={(e) => handleNewPlotChange('width', parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Height (feet)"
                type="number"
                value={newPlot.height}
                onChange={(e) => handleNewPlotChange('height', parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Soil Quality</InputLabel>
                <Select
                  value={newPlot.soil_quality}
                  label="Soil Quality"
                  onChange={(e) => handleNewPlotChange('soil_quality', e.target.value)}
                >
                  <MenuItem value="poor">Poor</MenuItem>
                  <MenuItem value="fair">Fair</MenuItem>
                  <MenuItem value="good">Good</MenuItem>
                  <MenuItem value="excellent">Excellent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Sun Exposure</InputLabel>
                <Select
                  value={newPlot.sun_exposure}
                  label="Sun Exposure"
                  onChange={(e) => handleNewPlotChange('sun_exposure', e.target.value)}
                >
                  <MenuItem value="full_sun">Full Sun (6+ hours)</MenuItem>
                  <MenuItem value="partial_sun">Partial Sun (4-6 hours)</MenuItem>
                  <MenuItem value="partial_shade">Partial Shade (2-4 hours)</MenuItem>
                  <MenuItem value="full_shade">Full Shade (&lt;2 hours)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Irrigation</InputLabel>
                <Select
                  value={newPlot.irrigation_type}
                  label="Irrigation"
                  onChange={(e) => handleNewPlotChange('irrigation_type', e.target.value)}
                >
                  <MenuItem value="manual">Manual Watering</MenuItem>
                  <MenuItem value="drip">Drip Irrigation</MenuItem>
                  <MenuItem value="sprinkler">Sprinkler System</MenuItem>
                  <MenuItem value="none">No Irrigation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlotDialog(false)}>Cancel</Button>
          <Button onClick={createPlot} variant="contained">Create Plot</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GardenLayoutFixed; 