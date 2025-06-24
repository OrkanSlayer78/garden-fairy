import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Divider,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  WbSunny as SunIcon,
  Opacity as WaterIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Book as JournalIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Event as EventIcon,
  Agriculture as PlantIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';

const PlantDetailDialog = ({ 
  open, 
  onClose, 
  plantPlacement, 
  onUpdatePlacement,
  onDeletePlacement 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [journalEntries, setJournalEntries] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plantStats, setPlantStats] = useState(null);
  
  // Journal entry form state
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [newJournalEntry, setNewJournalEntry] = useState({
    title: '',
    content: '',
    entry_type: 'observation',
    tags: []
  });

  // Load plant data when dialog opens
  useEffect(() => {
    if (open && plantPlacement) {
      loadPlantData();
    }
  }, [open, plantPlacement]);

  const loadPlantData = async () => {
    if (!plantPlacement) return;
    
    setLoading(true);
    try {
      // Load journal entries for this plant
      const journalResponse = await fetch(
        `/api/garden/journal/${plantPlacement.plant_id || plantPlacement.plant_type_id}`,
        { credentials: 'include' }
      );
      const journalData = await journalResponse.json();
      if (journalData.success) {
        setJournalEntries(journalData.entries || []);
      }

      // Load calendar events for this plant
      const eventsResponse = await fetch(
        `/api/garden/calendar/plant/${plantPlacement.plant_id || plantPlacement.plant_type_id}`,
        { credentials: 'include' }
      );
      const eventsData = await eventsResponse.json();
      if (eventsData.success) {
        setCalendarEvents(eventsData.events || []);
      }

      // Calculate plant statistics
      calculatePlantStats();
      
    } catch (error) {
      console.error('Error loading plant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlantStats = () => {
    if (!plantPlacement.planted_date) return;

    const plantedDate = new Date(plantPlacement.planted_date);
    const today = new Date();
    const daysPlanted = Math.floor((today - plantedDate) / (1000 * 60 * 60 * 24));
    
    // Mock harvest timeline (in production, this would come from plant database)
    const daysToHarvest = plantPlacement.days_to_harvest || 75;
    const harvestProgress = Math.min((daysPlanted / daysToHarvest) * 100, 100);
    
    // Estimate harvest date
    const estimatedHarvestDate = new Date(plantedDate);
    estimatedHarvestDate.setDate(estimatedHarvestDate.getDate() + daysToHarvest);

    setPlantStats({
      daysPlanted,
      daysToHarvest,
      harvestProgress,
      estimatedHarvestDate,
      plantedDate
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const upcoming = calendarEvents.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate >= today && !event.completed;
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    return upcoming.slice(0, 3); // Show next 3 events
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'watering': return '💧';
      case 'fertilizing': return '🌱';
      case 'harvesting': return '🌾';
      case 'pruning': return '✂️';
      case 'weeding': return '🌿';
      case 'pest_control': return '🐛';
      default: return '📅';
    }
  };

  const getEventPriority = (eventType, daysUntil) => {
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 1) return 'urgent';
    if (daysUntil <= 3) return 'important';
    return 'normal';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'overdue': return 'error';
      case 'urgent': return 'warning';
      case 'important': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWaterRequirementColor = (requirement) => {
    switch (requirement) {
      case 'low': return '#FFA94D';
      case 'medium': return '#74C0FC';
      case 'high': return '#339AF0';
      default: return '#74C0FC';
    }
  };

  const getSunRequirementText = (requirement) => {
    switch (requirement) {
      case 'full': return 'Full Sun (6+ hours)';
      case 'partial': return 'Partial Sun (4-6 hours)';
      case 'shade': return 'Shade (2-4 hours)';
      default: return 'Full Sun';
    }
  };

  // Handle journal entry submission
  const handleAddJournalEntry = async () => {
    if (!newJournalEntry.content.trim()) {
      alert('Please enter some content for your journal entry.');
      return;
    }

    try {
      const response = await fetch(
        `/api/garden/journal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            ...newJournalEntry,
            plant_id: plantPlacement.plant_id || plantPlacement.plant_type_id,
            placement_id: plantPlacement.id,
            entry_date: new Date().toISOString().split('T')[0]
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        // Add new entry to local state
        setJournalEntries(prev => [data.entry, ...prev]);
        
        // Reset form
        setNewJournalEntry({
          title: '',
          content: '',
          entry_type: 'observation',
          tags: []
        });
        
        setJournalDialogOpen(false);
        alert('Journal entry added successfully! 📝');
      } else {
        throw new Error(data.error || 'Failed to add journal entry');
      }
    } catch (error) {
      console.error('Error adding journal entry:', error);
      alert('Failed to add journal entry. Please try again.');
    }
  };

  const journalEntryTypes = [
    { value: 'observation', label: '👀 Observation' },
    { value: 'watering', label: '💧 Watering' },
    { value: 'fertilizing', label: '🌱 Fertilizing' },
    { value: 'pruning', label: '✂️ Pruning' },
    { value: 'harvesting', label: '🌾 Harvesting' },
    { value: 'pest_issue', label: '🐛 Pest Issue' },
    { value: 'disease', label: '🦠 Disease' },
    { value: 'milestone', label: '🎯 Milestone' }
  ];

  const commonTags = [
    'healthy', 'growing well', 'flowering', 'fruiting', 'needs attention',
    'pest damage', 'disease', 'yellowing leaves', 'stunted growth', 'recovered'
  ];

  if (!plantPlacement) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Avatar
              sx={{
                bgcolor: plantPlacement.plant_color || '#4CAF50',
                mr: 2,
                width: 48,
                height: 48,
                fontSize: '1.8rem'
              }}
            >
              {plantPlacement.plant_icon || '🌱'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {plantPlacement.plant_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {plantPlacement.variety || 'Standard variety'} • Planted {formatDate(plantPlacement.planted_date)}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Overview" icon={<InfoIcon />} />
            <Tab label="Care Schedule" icon={<CalendarIcon />} />
            <Tab label="Journal" icon={<JournalIcon />} />
          </Tabs>
        </Box>

        {loading && <LinearProgress sx={{ mt: 1 }} />}

        {/* Overview Tab */}
        {activeTab === 0 && (
          <Box sx={{ mt: 2 }}>
            {/* Plant Progress */}
            {plantStats && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🌱 Growth Progress
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">
                        Days Planted: {plantStats.daysPlanted}
                      </Typography>
                      <Typography variant="body2">
                        Days to Harvest: {plantStats.daysToHarvest - plantStats.daysPlanted}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={plantStats.harvestProgress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Estimated Harvest: {plantStats.estimatedHarvestDate.toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Plant Requirements */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌿 Plant Care Requirements
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SunIcon sx={{ mr: 1, color: 'orange' }} />
                      <Typography variant="body2" fontWeight="bold">
                        Sun Exposure
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {getSunRequirementText(plantPlacement.sun_requirement)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <WaterIcon sx={{ mr: 1, color: getWaterRequirementColor(plantPlacement.water_requirement) }} />
                      <Typography variant="body2" fontWeight="bold">
                        Water Needs
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {plantPlacement.water_requirement || 'Medium'} water requirements
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PlantIcon sx={{ mr: 1, color: 'green' }} />
                      <Typography variant="body2" fontWeight="bold">
                        Spacing
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {plantPlacement.spacing_inches || 12}" apart
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Plant Management Actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌱 Plant Management
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<span>💧</span>}
                      onClick={() => {
                        // Quick water log
                        setNewJournalEntry({
                          title: 'Watered plant',
                          content: `Watered ${plantPlacement.plant_name} today.`,
                          entry_type: 'watering',
                          tags: ['watering', 'care']
                        });
                        setJournalDialogOpen(true);
                      }}
                    >
                      Log Watering
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<span>🌱</span>}
                      onClick={() => {
                        setNewJournalEntry({
                          title: 'Fertilized plant',
                          content: `Applied fertilizer to ${plantPlacement.plant_name}.`,
                          entry_type: 'fertilizing',
                          tags: ['fertilizing', 'care']
                        });
                        setJournalDialogOpen(true);
                      }}
                    >
                      Log Fertilizing
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<span>✂️</span>}
                      onClick={() => {
                        setNewJournalEntry({
                          title: 'Pruned plant',
                          content: `Pruned ${plantPlacement.plant_name} for better growth.`,
                          entry_type: 'pruning',
                          tags: ['pruning', 'maintenance']
                        });
                        setJournalDialogOpen(true);
                      }}
                    >
                      Log Pruning
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<span>🌾</span>}
                      onClick={() => {
                        setNewJournalEntry({
                          title: 'Harvest time!',
                          content: `Harvested from ${plantPlacement.plant_name}. `,
                          entry_type: 'harvesting',
                          tags: ['harvest', 'success']
                        });
                        setJournalDialogOpen(true);
                      }}
                    >
                      Log Harvest
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Upcoming Events Preview */}
            {getUpcomingEvents().length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📅 Upcoming Care Tasks
                  </Typography>
                  {getUpcomingEvents().map((event, index) => {
                    const eventDate = new Date(event.event_date);
                    const today = new Date();
                    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                    const priority = getEventPriority(event.event_type, daysUntil);
                    
                    return (
                      <Box key={index} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Box display="flex" alignItems="center">
                          <Typography sx={{ mr: 1, fontSize: '1.2rem' }}>
                            {getEventIcon(event.event_type)}
                          </Typography>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {event.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(event.event_date)}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                          color={getPriorityColor(priority)}
                          size="small"
                        />
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* Care Schedule Tab */}
        {activeTab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              📅 Care Schedule & Events
            </Typography>
            {calendarEvents.length === 0 ? (
              <Alert severity="info">
                No care events scheduled for this plant yet. Consider adding watering, fertilizing, or harvest reminders!
              </Alert>
            ) : (
              <List>
                {calendarEvents.map((event, index) => {
                  const eventDate = new Date(event.event_date);
                  const today = new Date();
                  const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                  const isPast = eventDate < today;
                  
                  return (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: event.completed ? 'success.main' : isPast ? 'error.main' : 'primary.main' }}>
                            {event.completed ? <CheckIcon /> : getEventIcon(event.event_type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={event.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(event.event_date)} • {event.event_type?.replace('_', ' ')}
                              </Typography>
                              {event.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {event.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemIcon>
                          {event.completed ? (
                            <Chip label="Complete" color="success" size="small" />
                          ) : isPast ? (
                            <Chip label="Overdue" color="error" size="small" />
                          ) : (
                            <Chip label={daysUntil === 0 ? 'Today' : `${daysUntil}d`} color="primary" size="small" />
                          )}
                        </ListItemIcon>
                      </ListItem>
                      {index < calendarEvents.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Box>
        )}

        {/* Journal Tab */}
        {activeTab === 2 && (
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                📔 Plant Journal
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setJournalDialogOpen(true)}
              >
                Add Entry
              </Button>
            </Box>
            
            {journalEntries.length === 0 ? (
              <Alert severity="info">
                No journal entries yet. Start documenting your plant's growth, care activities, and observations!
              </Alert>
            ) : (
              journalEntries.map((entry, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {entry.title || `${entry.entry_type} Entry`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(entry.entry_date)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" paragraph>
                      {entry.content}
                    </Typography>
                    {entry.tags && entry.tags.length > 0 && (
                      <Box>
                        {entry.tags.map((tag, tagIndex) => (
                          <Chip key={tagIndex} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            if (window.confirm('Are you sure you want to remove this plant?')) {
              onDeletePlacement?.(plantPlacement.id);
              onClose();
            }
          }}
        >
          Remove Plant
        </Button>
      </DialogActions>

      {/* Journal Entry Dialog */}
      <Dialog open={journalDialogOpen} onClose={() => setJournalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📝 Add Journal Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Title (optional)"
              value={newJournalEntry.title}
              onChange={(e) => setNewJournalEntry(prev => ({ ...prev, title: e.target.value }))}
              margin="normal"
              placeholder="e.g., First flowers appearing!"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Entry Type</InputLabel>
              <Select
                value={newJournalEntry.entry_type}
                onChange={(e) => setNewJournalEntry(prev => ({ ...prev, entry_type: e.target.value }))}
                label="Entry Type"
              >
                {journalEntryTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Journal Entry"
              multiline
              rows={4}
              value={newJournalEntry.content}
              onChange={(e) => setNewJournalEntry(prev => ({ ...prev, content: e.target.value }))}
              margin="normal"
              placeholder="Describe what you observed, did, or learned about your plant..."
              required
            />
            
            <Autocomplete
              multiple
              freeSolo
              options={commonTags}
              value={newJournalEntry.tags}
              onChange={(event, newValue) => {
                setNewJournalEntry(prev => ({ ...prev, tags: newValue }));
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags (optional)"
                  placeholder="Add tags..."
                  margin="normal"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJournalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddJournalEntry}
            variant="contained"
            disabled={!newJournalEntry.content.trim()}
          >
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default PlantDetailDialog; 