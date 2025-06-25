import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Fab,
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
  Alert,
  Snackbar,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Autocomplete,
  Tab,
  Tabs,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  LocalFlorist as PlantIcon,
  Spa as SeedIcon,
  Agriculture as GrowingIcon,
  CheckCircle as HarvestedIcon,
  WbSunny as SunIcon,
  Opacity as WaterIcon,
  Schedule as CalendarIcon,
  Warning as WarningIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { plantsAPI } from '../services/api';
import AIPlantAssistant from './AIPlantAssistant';
import dayjs from 'dayjs';

const Plants = () => {
  // State management
  const [plants, setPlants] = useState([]);
  const [plantTypes, setPlantTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiSelectedPlant, setAiSelectedPlant] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    plant_type_id: '',
    custom_name: '',
    planted_date: null,
    expected_harvest_date: null,
    status: 'planned',
    notes: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plantsResponse, plantTypesResponse] = await Promise.all([
        plantsAPI.getPlants(),
        plantsAPI.getPlantTypes()
      ]);
      setPlants(plantsResponse.data);
      setPlantTypes(plantTypesResponse.data);
    } catch (error) {
      showSnackbar('Failed to load plants data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDialogOpen = (plant = null) => {
    if (plant) {
      setEditingPlant(plant);
      setFormData({
        plant_type_id: plant.plant_type?.id || '',
        custom_name: plant.custom_name || '',
        planted_date: plant.planted_date ? dayjs(plant.planted_date) : null,
        expected_harvest_date: plant.expected_harvest_date ? dayjs(plant.expected_harvest_date) : null,
        status: plant.status || 'planned',
        notes: plant.notes || ''
      });
    } else {
      setEditingPlant(null);
      setFormData({
        plant_type_id: '',
        custom_name: '',
        planted_date: null,
        expected_harvest_date: null,
        status: 'planned',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPlant(null);
  };

  const handleSavePlant = async () => {
    try {
      const plantData = {
        ...formData,
        planted_date: formData.planted_date ? formData.planted_date.format('YYYY-MM-DD') : null,
        expected_harvest_date: formData.expected_harvest_date ? formData.expected_harvest_date.format('YYYY-MM-DD') : null,
      };

      if (editingPlant) {
        await plantsAPI.updatePlant(editingPlant.id, plantData);
        showSnackbar('Plant updated successfully');
      } else {
        await plantsAPI.createPlant(plantData);
        showSnackbar('Plant added successfully');
      }

      fetchData();
      handleDialogClose();
    } catch (error) {
      showSnackbar('Failed to save plant', 'error');
    }
  };

  const handleDeletePlant = async (plantId) => {
    if (window.confirm('Are you sure you want to delete this plant?')) {
      try {
        await plantsAPI.deletePlant(plantId);
        showSnackbar('Plant deleted successfully');
        fetchData();
      } catch (error) {
        showSnackbar('Failed to delete plant', 'error');
      }
    }
    setMenuAnchor(null);
  };

  const handleMenuClick = (event, plant) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPlant(plant);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'planned': return <SeedIcon />;
      case 'planted': return <PlantIcon />;
      case 'growing': return <GrowingIcon />;
      case 'harvested': return <HarvestedIcon />;
      default: return <PlantIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planned': return 'default';
      case 'planted': return 'primary';
      case 'growing': return 'success';
      case 'harvested': return 'secondary';
      default: return 'default';
    }
  };

  const filteredPlants = plants.filter(plant => {
    switch (tabValue) {
      case 0: return true; // All plants
      case 1: return plant.status === 'planned';
      case 2: return ['planted', 'growing'].includes(plant.status);
      case 3: return plant.status === 'harvested';
      default: return true;
    }
  });

  const selectedPlantType = plantTypes.find(type => type.id === formData.plant_type_id);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Loading plants...</Typography>
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Plants 🌱
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your garden plants and track their progress
          </Typography>
        </Box>
        <Fab
          color="primary"
          aria-label="add plant"
          onClick={() => handleDialogOpen()}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Tabs for filtering */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`All (${plants.length})`} />
          <Tab label={`Planned (${plants.filter(p => p.status === 'planned').length})`} />
          <Tab label={`Growing (${plants.filter(p => ['planted', 'growing'].includes(p.status)).length})`} />
          <Tab label={`Harvested (${plants.filter(p => p.status === 'harvested').length})`} />
        </Tabs>
      </Box>

      {/* Plants Grid */}
      {filteredPlants.length === 0 ? (
        <Box textAlign="center" py={6}>
          <PlantIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No plants found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {tabValue === 0 
              ? "Start building your garden by adding your first plant!"
              : "No plants match the current filter."
            }
          </Typography>
          <Button variant="contained" onClick={() => handleDialogOpen()}>
            Add Your First Plant
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredPlants.map((plant) => (
            <Grid item xs={12} sm={6} md={4} key={plant.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {getStatusIcon(plant.status)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="h3">
                          {plant.custom_name || plant.plant_type?.name}
                        </Typography>
                        {plant.custom_name && (
                          <Typography variant="body2" color="text.secondary">
                            {plant.plant_type?.name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <IconButton onClick={(e) => handleMenuClick(e, plant)}>
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  <Chip
                    label={plant.status}
                    color={getStatusColor(plant.status)}
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  {plant.plant_type && (
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <SunIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                        <Typography variant="body2">
                          {plant.plant_type.sun_requirement} sun
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <WaterIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                        <Typography variant="body2">
                          {plant.plant_type.water_requirement} water
                        </Typography>
                      </Box>
                      {plant.plant_type.days_to_harvest && (
                        <Box display="flex" alignItems="center">
                          <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                          <Typography variant="body2">
                            {plant.plant_type.days_to_harvest} days to harvest
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {plant.planted_date && (
                    <Typography variant="body2" color="text.secondary">
                      Planted: {dayjs(plant.planted_date).format('MMM DD, YYYY')}
                    </Typography>
                  )}

                  {plant.expected_harvest_date && (
                    <Typography variant="body2" color="text.secondary">
                      Expected harvest: {dayjs(plant.expected_harvest_date).format('MMM DD, YYYY')}
                    </Typography>
                  )}

                  {plant.notes && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                      "{plant.notes}"
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setAiSelectedPlant(selectedPlant);
          setAiAssistantOpen(true);
          setMenuAnchor(null);
        }}>
          <ListItemIcon>
            <AIIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText>🤖 Ask AI Assistant</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDialogOpen(selectedPlant);
          setMenuAnchor(null);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Plant</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeletePlant(selectedPlant?.id)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Plant</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Plant Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlant ? 'Edit Plant' : 'Add New Plant'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={plantTypes}
                getOptionLabel={(option) => option.name}
                value={selectedPlantType || null}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, plant_type_id: newValue?.id || '' });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Plant Type"
                    required
                    helperText="Select the type of plant you're growing"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom Name"
                value={formData.custom_name}
                onChange={(e) => setFormData({ ...formData, custom_name: e.target.value })}
                helperText="Give your plant a custom name (optional)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Planted Date"
                value={formData.planted_date}
                onChange={(newValue) => setFormData({ ...formData, planted_date: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expected Harvest Date"
                value={formData.expected_harvest_date}
                onChange={(newValue) => setFormData({ ...formData, expected_harvest_date: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="planned">Planned</MenuItem>
                  <MenuItem value="planted">Planted</MenuItem>
                  <MenuItem value="growing">Growing</MenuItem>
                  <MenuItem value="harvested">Harvested</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                helperText="Add any notes about this plant"
              />
            </Grid>

            {/* Plant Type Info Display with Intelligence */}
            {selectedPlantType && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={0} onChange={() => {}}>
                      <Tab label="Basic Info" />
                    </Tabs>
                  </Box>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Plant Information
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedPlantType.description}
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Chip label={`${selectedPlantType.sun_requirement} sun`} size="small" />
                      <Chip label={`${selectedPlantType.water_requirement} water`} size="small" />
                      {selectedPlantType.days_to_harvest && (
                        <Chip label={`${selectedPlantType.days_to_harvest} days to harvest`} size="small" />
                      )}
                      <Chip label={selectedPlantType.category} size="small" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSavePlant} 
            variant="contained"
            disabled={!formData.plant_type_id}
          >
            {editingPlant ? 'Update' : 'Add'} Plant
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* AI Plant Assistant Dialog */}
      <AIPlantAssistant
        open={aiAssistantOpen}
        onClose={() => {
          setAiAssistantOpen(false);
          setAiSelectedPlant(null);
        }}
        plantData={aiSelectedPlant}
      />
    </Box>
  );
};

export default Plants; 