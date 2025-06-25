import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  LocalFlorist as PlantIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as GrowingIcon,
  CheckCircle as HarvestedIcon,
  Warning as OverdueIcon,
  Add as AddIcon,
  SmartToy,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { plantsAPI, calendarAPI } from '../services/api';
import AIPlantAssistant from './AIPlantAssistant';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [overdueEvents, setOverdueEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, upcomingResponse, overdueResponse] = await Promise.all([
        plantsAPI.getPlantStats(),
        calendarAPI.getUpcomingEvents(),
        calendarAPI.getOverdueEvents(),
      ]);

      setStats(statsResponse.data);
      setUpcomingEvents(upcomingResponse.data);
      setOverdueEvents(overdueResponse.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      planting: 'success',
      watering: 'info',
      fertilizing: 'warning',
      harvesting: 'secondary',
      pruning: 'primary',
    };
    return colors[eventType] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      {/* Welcome Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Your Garden! 🌱
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Here's what's happening in your garden today
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PlantIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.total_plants || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Plants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <GrowingIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {(stats?.planted_plants || 0) + (stats?.growing_plants || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Plants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <HarvestedIcon color="secondary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.harvested_plants || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Harvested
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CalendarIcon color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {upcomingEvents.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Tasks
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                onClick={() => navigate('/plants')}
              >
                Add New Plant
              </Button>
              <Button
                variant="outlined"
                startIcon={<CalendarIcon />}
                fullWidth
                onClick={() => navigate('/calendar')}
              >
                Schedule Task
              </Button>
              <Button
                variant="contained"
                startIcon={<SmartToy />}
                fullWidth
                onClick={() => setAiAssistantOpen(true)}
                sx={{ 
                  background: 'linear-gradient(45deg, #9c27b0 30%, #673ab7 90%)',
                  color: 'white'
                }}
              >
                🤖 AI Plant Assistant
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/garden')}
              >
                Plan Garden Layout
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Upcoming Events */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Tasks
            </Typography>
            {upcomingEvents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No upcoming tasks. Great job staying on top of your garden!
              </Typography>
            ) : (
              <List dense>
                {upcomingEvents.slice(0, 5).map((event) => (
                  <ListItem key={event.id} divider>
                    <ListItemIcon>
                      <CalendarIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={event.title}
                      secondary={formatDate(event.event_date)}
                    />
                    <Chip
                      size="small"
                      label={event.event_type}
                      color={getEventTypeColor(event.event_type)}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {upcomingEvents.length > 5 && (
              <Button
                size="small"
                onClick={() => navigate('/calendar')}
                sx={{ mt: 1 }}
              >
                View All
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Overdue Tasks */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <OverdueIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Overdue Tasks
              </Typography>
            </Box>
            {overdueEvents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No overdue tasks. Your garden is well maintained!
              </Typography>
            ) : (
              <List dense>
                {overdueEvents.slice(0, 5).map((event) => (
                  <ListItem key={event.id} divider>
                    <ListItemIcon>
                      <OverdueIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={event.title}
                      secondary={`Due: ${formatDate(event.event_date)}`}
                    />
                    <Chip
                      size="small"
                      label={event.event_type}
                      color="warning"
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {overdueEvents.length > 5 && (
              <Button
                size="small"
                onClick={() => navigate('/calendar')}
                sx={{ mt: 1 }}
              >
                View All
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Garden Tips */}
      <Box mt={4}>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)' }}>
          <Typography variant="h6" gutterBottom>
            🌟 Garden Tips
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Water your plants early in the morning for best absorption
            • Check soil moisture before watering - stick your finger 1-2 inches deep
            • Rotate crops annually to prevent soil depletion
            • Companion planting can help with pest control naturally
          </Typography>
        </Paper>
      </Box>

      {/* Floating AI Assistant Button */}
      <Tooltip title="Ask AI Plant Assistant" placement="left">
        <Fab
          color="secondary"
          aria-label="ai assistant"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(45deg, #9c27b0 30%, #673ab7 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #7b1fa2 30%, #512da8 90%)',
            }
          }}
          onClick={() => setAiAssistantOpen(true)}
        >
          <SmartToy />
        </Fab>
      </Tooltip>

      {/* AI Plant Assistant Dialog */}
      <AIPlantAssistant
        open={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />
    </Box>
  );
};

export default Dashboard; 