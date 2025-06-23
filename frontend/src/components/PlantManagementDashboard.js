import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  LinearProgress,
  Paper,
  Stack,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  WbSunny as SunIcon,
  Opacity as WaterIcon,
  Schedule as ScheduleIcon,
  Book as JournalIcon,
  Agriculture as PlantIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import PlantDetailDialog from './PlantDetailDialog';

const PlantManagementDashboard = () => {
  const [plotsWithPlants, setPlotsWithPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plantDetailOpen, setPlantDetailOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadPlantsData();
  }, [refreshTrigger]);

  const loadPlantsData = async () => {
    setLoading(true);
    try {
      // Load plots and placements
      const [plotsResponse, placementsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/garden/plots', { credentials: 'include' }),
        fetch('http://localhost:5000/api/garden/placements', { credentials: 'include' })
      ]);

      const plotsData = await plotsResponse.json();
      const placementsData = await placementsResponse.json();

      if (plotsData.success && placementsData.success) {
        // Group placements by plot
        const plotsMap = new Map();
        
        // Initialize all plots
        plotsData.plots.forEach(plot => {
          plotsMap.set(plot.id, {
            ...plot,
            placements: []
          });
        });

        // Add placements to their plots and load recent journal entries
        for (const placement of placementsData.placements) {
          if (plotsMap.has(placement.plot_id)) {
            // Load recent journal entries for this plant
            try {
              const journalResponse = await fetch(
                `http://localhost:5000/api/garden/journal/${placement.plant_id}`,
                { credentials: 'include' }
              );
              const journalData = await journalResponse.json();
              
              const recentEntries = journalData.success ? journalData.entries : [];
              const lastWatering = recentEntries.find(entry => entry.entry_type === 'watering');
              const mostRecentEntry = recentEntries[0]; // Already sorted by date desc
              
              plotsMap.get(placement.plot_id).placements.push({
                ...placement,
                recentJournalEntry: mostRecentEntry,
                lastWatering: lastWatering,
                journalCount: recentEntries.length
              });
            } catch (error) {
              console.error('Error loading journal for plant:', placement.plant_id, error);
              plotsMap.get(placement.plot_id).placements.push({
                ...placement,
                recentJournalEntry: null,
                lastWatering: null,
                journalCount: 0
              });
            }
          }
        }

        // Convert to array and filter out empty plots
        const plotsWithPlantsArray = Array.from(plotsMap.values()).filter(plot => plot.placements.length > 0);
        setPlotsWithPlants(plotsWithPlantsArray);
      }
    } catch (error) {
      console.error('Error loading plants data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlantClick = (placement) => {
    setSelectedPlant(placement);
    setPlantDetailOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getWateringStatus = (lastWatering) => {
    if (!lastWatering) return { status: 'unknown', color: 'default', message: 'No water logged' };
    
    const waterDate = new Date(lastWatering.entry_date);
    const now = new Date();
    const daysSince = Math.floor((now - waterDate) / (1000 * 60 * 60 * 24));
    
    if (daysSince <= 1) return { status: 'good', color: 'success', message: 'Recently watered' };
    if (daysSince <= 3) return { status: 'ok', color: 'info', message: 'Check soon' };
    if (daysSince <= 7) return { status: 'needs', color: 'warning', message: 'Needs water' };
    return { status: 'urgent', color: 'error', message: 'Urgent watering needed' };
  };

  const getPlantHealth = (placement) => {
    const wateringStatus = getWateringStatus(placement.lastWatering);
    const hasRecentJournal = placement.recentJournalEntry && 
      new Date(placement.recentJournalEntry.entry_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (wateringStatus.status === 'urgent') return { status: 'poor', color: 'error' };
    if (wateringStatus.status === 'needs') return { status: 'fair', color: 'warning' };
    if (wateringStatus.status === 'good' && hasRecentJournal) return { status: 'excellent', color: 'success' };
    return { status: 'good', color: 'info' };
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>🌱 Plant Management Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          🌱 Plant Management Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setRefreshTrigger(prev => prev + 1)}
        >
          Refresh Data
        </Button>
      </Box>

      {plotsWithPlants.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No plants found in your garden plots. Start by designing some plots and adding plants!
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {plotsWithPlants.map((plot) => (
            <Grid item xs={12} key={plot.id}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" sx={{ width: '100%' }}>
                    <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {plot.name}
                    </Typography>
                    <Badge badgeContent={plot.placements.length} color="primary" sx={{ mr: 2 }}>
                      <PlantIcon />
                    </Badge>
                    <Chip 
                      label={`${plot.soil_quality} soil • ${plot.sun_exposure}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {plot.placements.map((placement) => {
                      const wateringStatus = getWateringStatus(placement.lastWatering);
                      const plantHealth = getPlantHealth(placement);
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={placement.id}>
                          <Card 
                            sx={{ 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 4
                              },
                              borderLeft: `4px solid`,
                              borderLeftColor: `${plantHealth.color}.main`
                            }}
                            onClick={() => handlePlantClick(placement)}
                          >
                            <CardContent>
                              <Box display="flex" alignItems="center" mb={2}>
                                <Avatar sx={{ 
                                  bgcolor: placement.plant_color || '#4CAF50', 
                                  mr: 2,
                                  width: 48,
                                  height: 48
                                }}>
                                  <Typography sx={{ fontSize: '24px' }}>
                                    {placement.plant_icon || '🌱'}
                                  </Typography>
                                </Avatar>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography variant="h6" noWrap>
                                    {placement.plant_name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {placement.plant?.plant_type?.scientific_name || 'Unknown variety'}
                                  </Typography>
                                </Box>
                                <Chip 
                                  label={plantHealth.status}
                                  color={plantHealth.color}
                                  size="small"
                                />
                              </Box>

                              {/* Watering Status */}
                              <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                  <Box display="flex" alignItems="center">
                                    <WaterIcon sx={{ mr: 1, color: `${wateringStatus.color}.main` }} />
                                    <Typography variant="body2" fontWeight="bold">
                                      Last Watered
                                    </Typography>
                                  </Box>
                                  <Box textAlign="right">
                                    <Typography variant="body2">
                                      {formatRelativeDate(placement.lastWatering?.entry_date)}
                                    </Typography>
                                    <Chip 
                                      label={wateringStatus.message}
                                      color={wateringStatus.color}
                                      size="small"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  </Box>
                                </Box>
                              </Paper>

                              {/* Recent Journal Entry */}
                              <Paper sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                                <Box display="flex" alignItems="center" mb={1}>
                                  <JournalIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" fontWeight="bold">
                                    Recent Activity
                                  </Typography>
                                  <Chip 
                                    label={`${placement.journalCount} entries`}
                                    size="small"
                                    sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
                                  />
                                </Box>
                                {placement.recentJournalEntry ? (
                                  <Box>
                                    <Typography variant="body2" sx={{ 
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      mb: 0.5
                                    }}>
                                      {placement.recentJournalEntry.title || placement.recentJournalEntry.content}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatRelativeDate(placement.recentJournalEntry.entry_date)} • {placement.recentJournalEntry.entry_type}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    No journal entries yet
                                  </Typography>
                                )}
                              </Paper>

                              {/* Planted Date */}
                              {placement.planted_date && (
                                <Box display="flex" alignItems="center" mt={1}>
                                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    Planted {formatDate(placement.planted_date)}
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Plant Detail Dialog */}
      <PlantDetailDialog
        open={plantDetailOpen}
        onClose={() => {
          setPlantDetailOpen(false);
          setRefreshTrigger(prev => prev + 1); // Refresh data when dialog closes
        }}
        plantPlacement={selectedPlant}
        onUpdatePlacement={() => setRefreshTrigger(prev => prev + 1)}
        onDeletePlacement={() => {
          setRefreshTrigger(prev => prev + 1);
          setPlantDetailOpen(false);
        }}
      />
    </Box>
  );
};

export default PlantManagementDashboard; 