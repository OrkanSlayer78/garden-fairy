import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Fab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalFlorist as PlantIcon,
  Book as JournalIcon,
  Map as MapIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const GardenLayout = () => {
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [gardenLocation, setGardenLocation] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState(null);
  const [plots, setPlots] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [plants, setPlants] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);

  const steps = [
    'Set Garden Location',
    'Draw Garden Plots', 
    'Place Plants',
    'Manage & Journal'
  ];

  // Location selection component
  const LocationSelector = () => {
    const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]); // Center of US
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    // Component to handle map clicks
    const LocationMarker = () => {
      useMapEvents({
        click(e) {
          setSelectedPosition(e.latlng);
          reverseGeocode(e.latlng.lat, e.latlng.lng);
        },
      });

      return selectedPosition === null ? null : (
        <Marker position={selectedPosition}>
          <Popup>Your garden location</Popup>
        </Marker>
      );
    };

    const reverseGeocode = async (lat, lng) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        setAddress(data.display_name || '');
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    };

    const requestLocation = () => {
      setLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setMapCenter([lat, lng]);
            setSelectedPosition({ lat, lng });
            reverseGeocode(lat, lng);
            setLoading(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLoading(false);
          }
        );
      }
    };

    const saveLocation = async () => {
      if (!selectedPosition) return;

      try {
        const response = await fetch('/api/garden/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            latitude: selectedPosition.lat,
            longitude: selectedPosition.lng,
            address: address
          })
        });

        const data = await response.json();
        if (data.success) {
          setGardenLocation(data.location);
          
          // Fetch environmental data
          const envResponse = await fetch(
            `/api/garden/environmental-data/${selectedPosition.lat}/${selectedPosition.lng}`,
            { credentials: 'include' }
          );
          const envData = await envResponse.json();
          if (envData.success) {
            setEnvironmentalData(envData.data);
          }
          
          setActiveStep(1);
        }
      } catch (error) {
        console.error('Error saving location:', error);
      }
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Choose Your Garden Location 📍
        </Typography>
        
        <Box mb={2}>
          <Button variant="outlined" onClick={requestLocation} disabled={loading}>
            {loading ? 'Getting Location...' : 'Use My Current Location'}
          </Button>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Or click on the map to select your garden location
          </Typography>
        </Box>

        <Box height={400} mb={2}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker />
          </MapContainer>
        </Box>

        {selectedPosition && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Selected Location
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coordinates: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
              </Typography>
              {address && (
                <Typography variant="body2" color="text.secondary">
                  Address: {address}
                </Typography>
              )}
              <Box mt={2}>
                <Button variant="contained" onClick={saveLocation}>
                  Save Location & Continue
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {environmentalData && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Environmental Information 🌦️
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Climate Zone:</strong> {environmentalData.climate_zone}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Soil Type:</strong> {environmentalData.soil_data.type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Annual Rainfall:</strong> {environmentalData.average_rainfall.annual_average}"
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Fire Risk:</strong> {environmentalData.fire_risk.risk_level}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  // Plot drawing component
  const PlotDesigner = () => {
    const [drawingMode, setDrawingMode] = useState(false);
    const [plotDialog, setPlotDialog] = useState(false);
    const [newPlot, setNewPlot] = useState({
      name: '',
      width: 4,
      height: 4,
      soil_quality: 'good',
      sun_exposure: 'full_sun',
      irrigation_type: 'manual'
    });

    const createPlot = async () => {
      try {
        const response = await fetch('/api/garden/plots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...newPlot,
            garden_location_id: gardenLocation.id,
            center_x: Math.random() * 400 + 50, // Random positioning for demo
            center_y: Math.random() * 300 + 50,
          })
        });

        const data = await response.json();
        if (data.success) {
          setPlots([...plots, data.plot]);
          setPlotDialog(false);
          setNewPlot({
            name: '',
            width: 4,
            height: 4,
            soil_quality: 'good',
            sun_exposure: 'full_sun',
            irrigation_type: 'manual'
          });
        }
      } catch (error) {
        console.error('Error creating plot:', error);
      }
    };

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            Design Your Garden Plots 🎨
          </Typography>
          <Button variant="contained" onClick={() => setPlotDialog(true)}>
            Add Plot
          </Button>
        </Box>

        {/* Garden Canvas */}
        <Paper sx={{ height: 400, position: 'relative', border: '2px dashed #ccc' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: 'text.secondary'
            }}
          >
            Your Garden Layout
          </Typography>
          
          {plots.map((plot) => (
            <Box
              key={plot.id}
              sx={{
                position: 'absolute',
                left: plot.center_x,
                top: plot.center_y,
                width: plot.width * 20,
                height: plot.height * 20,
                backgroundColor: 'green',
                opacity: 0.3,
                border: '2px solid green',
                borderRadius: 1,
                cursor: 'pointer'
              }}
              onClick={() => setSelectedPlot(plot)}
            >
              <Typography variant="caption" sx={{ p: 0.5, color: 'white' }}>
                {plot.name}
              </Typography>
            </Box>
          ))}
        </Paper>

        <Box mt={2} display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(0)}>Back</Button>
          <Button 
            variant="contained" 
            onClick={() => setActiveStep(2)}
            disabled={plots.length === 0}
          >
            Continue to Plant Placement
          </Button>
        </Box>

        {/* Add Plot Dialog */}
        <Dialog open={plotDialog} onClose={() => setPlotDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Garden Plot</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Plot Name"
                  value={newPlot.name}
                  onChange={(e) => setNewPlot({...newPlot, name: e.target.value})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Width (feet)"
                  type="number"
                  value={newPlot.width}
                  onChange={(e) => setNewPlot({...newPlot, width: parseFloat(e.target.value)})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Height (feet)"
                  type="number"
                  value={newPlot.height}
                  onChange={(e) => setNewPlot({...newPlot, height: parseFloat(e.target.value)})}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Soil Quality</InputLabel>
                  <Select
                    value={newPlot.soil_quality}
                    label="Soil Quality"
                    onChange={(e) => setNewPlot({...newPlot, soil_quality: e.target.value})}
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
                    onChange={(e) => setNewPlot({...newPlot, sun_exposure: e.target.value})}
                  >
                    <MenuItem value="full_sun">Full Sun (6+ hours)</MenuItem>
                    <MenuItem value="partial_sun">Partial Sun (4-6 hours)</MenuItem>
                    <MenuItem value="partial_shade">Partial Shade (2-4 hours)</MenuItem>
                    <MenuItem value="full_shade">Full Shade (&lt;2 hours)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlotDialog(false)}>Cancel</Button>
            <Button onClick={createPlot} variant="contained">Add Plot</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // Draggable plant component
  const DraggablePlant = ({ plant }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'plant',
      item: { plant },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    return (
      <Card 
        ref={drag}
        sx={{ 
          cursor: 'move', 
          opacity: isDragging ? 0.5 : 1,
          mb: 1,
          minHeight: 60
        }}
      >
        <CardContent sx={{ p: 1 }}>
          <Box display="flex" alignItems="center">
            <PlantIcon sx={{ mr: 1, color: 'green' }} />
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {plant.custom_name || plant.plant_type?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {plant.plant_type?.category}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Plant placement component
  const PlantPlacer = () => {
    const handleDrop = useCallback(async (item, plotId, position) => {
      try {
        const response = await fetch('/api/garden/placements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            plant_id: item.plant.id,
            plot_id: plotId,
            x_position: position.x,
            y_position: position.y,
            planted_date: new Date().toISOString().split('T')[0]
          })
        });

        const data = await response.json();
        if (data.success) {
          setPlacements([...placements, data.placement]);
        }
      } catch (error) {
        console.error('Error placing plant:', error);
      }
    }, [placements]);

    // Droppable plot component
    const DroppablePlot = ({ plot }) => {
      const [{ isOver }, drop] = useDrop(() => ({
        accept: 'plant',
        drop: (item, monitor) => {
          const offset = monitor.getClientOffset();
          const plotRect = document.getElementById(`plot-${plot.id}`).getBoundingClientRect();
          const position = {
            x: offset.x - plotRect.left,
            y: offset.y - plotRect.top
          };
          handleDrop(item, plot.id, position);
        },
        collect: (monitor) => ({
          isOver: monitor.isOver(),
        }),
      }));

      return (
        <Box
          id={`plot-${plot.id}`}
          ref={drop}
          sx={{
            position: 'absolute',
            left: plot.center_x,
            top: plot.center_y,
            width: plot.width * 20,
            height: plot.height * 20,
            backgroundColor: isOver ? 'lightgreen' : 'green',
            opacity: 0.3,
            border: '2px solid green',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" sx={{ p: 0.5, color: 'white' }}>
            {plot.name}
          </Typography>
          
          {/* Render placed plants */}
          {placements
            .filter(p => p.plot_id === plot.id)
            .map((placement) => (
              <Box
                key={placement.id}
                sx={{
                  position: 'absolute',
                  left: placement.x_position,
                  top: placement.y_position,
                  width: 20,
                  height: 20,
                  backgroundColor: 'red',
                  borderRadius: '50%',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPlant(placement)}
                title={placement.plant?.custom_name || placement.plant?.plant_type?.name}
              />
            ))}
        </Box>
      );
    };

    return (
      <DndProvider backend={HTML5Backend}>
        <Grid container spacing={3}>
          <Grid item xs={8}>
            <Typography variant="h6" gutterBottom>
              Drag Plants to Your Plots 🌱
            </Typography>
            <Paper sx={{ height: 400, position: 'relative', border: '2px dashed #ccc' }}>
              {plots.map((plot) => (
                <DroppablePlot key={plot.id} plot={plot} />
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={4}>
            <Typography variant="h6" gutterBottom>
              Available Plants
            </Typography>
            <Box maxHeight={350} overflow="auto">
              {plants.map((plant) => (
                <DraggablePlant key={plant.id} plant={plant} />
              ))}
            </Box>
          </Grid>
        </Grid>

        <Box mt={2} display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(1)}>Back</Button>
          <Button variant="contained" onClick={() => setActiveStep(3)}>
            Continue to Management
          </Button>
        </Box>
      </DndProvider>
    );
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load existing garden location
        const locationResponse = await fetch('/api/garden/location', { credentials: 'include' });
        const locationData = await locationResponse.json();
        if (locationData.success && locationData.location) {
          setGardenLocation(locationData.location);
          setActiveStep(1);
        }

        // Load plots
        const plotsResponse = await fetch('/api/garden/plots', { credentials: 'include' });
        const plotsData = await plotsResponse.json();
        if (plotsData.success) {
          setPlots(plotsData.plots);
        }

        // Load plants
        const plantsResponse = await fetch('/api/plants', { credentials: 'include' });
        const plantsData = await plantsResponse.json();
        if (plantsData.success) {
          setPlants(plantsData.plants);
        }

        // Load placements
        const placementsResponse = await fetch('/api/garden/placements', { credentials: 'include' });
        const placementsData = await placementsResponse.json();
        if (placementsData.success) {
          setPlacements(placementsData.placements);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
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
        return null;
    }
  };

  // Plant management and journaling component
  const PlantManagement = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Manage Your Garden & Keep a Journal 📔
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={8}>
            <Paper sx={{ height: 400, position: 'relative' }}>
              {plots.map((plot) => (
                <Box
                  key={plot.id}
                  sx={{
                    position: 'absolute',
                    left: plot.center_x,
                    top: plot.center_y,
                    width: plot.width * 20,
                    height: plot.height * 20,
                    backgroundColor: 'green',
                    opacity: 0.3,
                    border: '2px solid green',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ p: 0.5, color: 'white' }}>
                    {plot.name}
                  </Typography>
                  
                  {placements
                    .filter(p => p.plot_id === plot.id)
                    .map((placement) => (
                      <Box
                        key={placement.id}
                        sx={{
                          position: 'absolute',
                          left: placement.x_position,
                          top: placement.y_position,
                          width: 20,
                          height: 20,
                          backgroundColor: 'red',
                          borderRadius: '50%',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelectedPlant(placement);
                          setJournalDialogOpen(true);
                        }}
                        title={placement.plant?.custom_name || placement.plant?.plant_type?.name}
                      />
                    ))}
                </Box>
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={4}>
            <Typography variant="subtitle1" gutterBottom>
              Recent Journal Entries
            </Typography>
            <Alert severity="info">
              Click on any plant to add a journal entry about its progress!
            </Alert>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box className="fade-in">
      <Typography variant="h4" component="h1" gutterBottom>
        Garden Layout Designer 🗺️
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Design your perfect garden with GPS location, intelligent plot planning, and plant journaling
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      {/* Plant Journal Dialog */}
      <Dialog 
        open={journalDialogOpen} 
        onClose={() => setJournalDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Plant Journal - {selectedPlant?.plant?.custom_name || selectedPlant?.plant?.plant_type?.name}
        </DialogTitle>
        <DialogContent>
          <Typography>Journal functionality coming soon!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJournalDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GardenLayout; 