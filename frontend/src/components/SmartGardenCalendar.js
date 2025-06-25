import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tab,
  Tabs,
  Paper,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  IconButton,
  Fab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  WbSunny as SunIcon,
  Opacity as WaterIcon,
  Schedule as ScheduleIcon,
  Agriculture as PlantIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  CloudQueue as WeatherIcon,
  AutoFixHigh as AutoIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Visibility as InsightsIcon
} from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const SmartGardenCalendar = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [events, setEvents] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [plotEvents, setPlotEvents] = useState({});
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleGenerating, setScheduleGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleSyncDialogOpen, setGoogleSyncDialogOpen] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEvents(),
        loadWeatherData(),
        loadInsights(),
        loadGoogleCalendarStatus()
      ]);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleCalendarStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/calendar/google-status', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setGoogleCalendarConnected(data.google_calendar_connected);
      }
    } catch (error) {
      console.error('Error loading Google Calendar status:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/calendar', {
        credentials: 'include'
      });
      const data = await response.json();
      
      // Transform events for calendar display
      const calendarEvents = data.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.event_date),
        end: new Date(event.event_date),
        resource: {
          type: event.event_type,
          completed: event.completed,
          plant: event.plant,
          description: event.description
        }
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadWeatherData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/calendar/weather-forecast', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setWeatherData(data.weather);
      }
    } catch (error) {
      console.error('Error loading weather:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/calendar/smart-insights', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const generateSmartSchedule = async () => {
    setScheduleGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/calendar/generate-schedule', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setLastGenerated(new Date());
        setScheduleDialogOpen(false);
        await loadCalendarData(); // Refresh all data
        alert(`🎉 Success! Generated ${data.total_events} garden tasks across ${Object.keys(data.plot_schedules).length} plots!`);
      } else {
        throw new Error(data.error || 'Failed to generate schedule');
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setScheduleGenerating(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      // Get authorization URL
      const response = await fetch('http://localhost:5000/api/calendar/google-auth-url', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // Open Google OAuth in popup
        window.open(data.auth_url, 'google-oauth', 'width=500,height=600');
        
        // Listen for OAuth completion
        window.addEventListener('message', handleGoogleOAuthCallback);
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      alert('Failed to connect Google Calendar');
    }
  };

  const handleGoogleOAuthCallback = async (event) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'GOOGLE_OAUTH_SUCCESS' && event.data.code) {
      try {
        const response = await fetch('http://localhost:5000/api/calendar/google-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: event.data.code })
        });
        
        const result = await response.json();
        if (result.success) {
          setGoogleCalendarConnected(true);
          alert('🎉 Google Calendar connected successfully!');
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        alert('Failed to connect Google Calendar');
      }
      
      // Remove event listener
      window.removeEventListener('message', handleGoogleOAuthCallback);
    }
  };

  const syncToGoogleCalendar = async () => {
    setGoogleSyncing(true);
    try {
      const response = await fetch('http://localhost:5000/api/calendar/google-sync', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setGoogleSyncDialogOpen(false);
        alert(`📅 ${data.message}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      alert('Failed to sync with Google Calendar');
    } finally {
      setGoogleSyncing(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/calendar/google-disconnect', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setGoogleCalendarConnected(false);
        alert('Google Calendar disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      alert('Failed to disconnect Google Calendar');
    }
  };

  const getEventColor = (eventType) => {
    const colors = {
      watering: '#2196F3',
      fertilizing: '#4CAF50',
      pruning: '#FF9800',
      harvesting: '#9C27B0',
      pest_control: '#F44336',
      planting: '#8BC34A'
    };
    return colors[eventType] || '#757575';
  };

  const getEventIcon = (eventType) => {
    const icons = {
      watering: '💧',
      fertilizing: '🌱',
      pruning: '✂️',
      harvesting: '🌾',
      pest_control: '🐛',
      planting: '🌱'
    };
    return icons[eventType] || '📅';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (description) => {
    const desc = description?.toLowerCase() || '';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('sun') || desc.includes('clear')) return '☀️';
    if (desc.includes('snow')) return '❄️';
    return '🌤️';
  };

  const upcomingEvents = events
    .filter(event => event.start >= new Date() && !event.resource.completed)
    .sort((a, b) => a.start - b.start)
    .slice(0, 10);

  const overdueEvents = events
    .filter(event => event.start < new Date() && !event.resource.completed)
    .sort((a, b) => b.start - a.start);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>🗓️ Smart Garden Calendar</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          🗓️ Smart Garden Calendar
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCalendarData}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          
          {/* Google Calendar Sync Button */}
          {googleCalendarConnected ? (
            <Button
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={() => setGoogleSyncDialogOpen(true)}
              sx={{ mr: 2 }}
              color="success"
            >
              📅 Sync to Google
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={connectGoogleCalendar}
              sx={{ mr: 2 }}
            >
              Connect Google Calendar
            </Button>
          )}
          
          <Button
            variant="contained"
            startIcon={<AutoIcon />}
            onClick={() => setScheduleDialogOpen(true)}
            color="primary"
          >
            Generate Smart Schedule
          </Button>
        </Box>
      </Box>

      {/* Weather Widget */}
      {weatherData && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" gutterBottom>
                  🌤️ Weather Forecast
                </Typography>
                <Typography variant="h4">
                  {Math.round(weatherData.current.temperature)}°C
                </Typography>
                <Typography variant="body1">
                  {getWeatherIcon(weatherData.current.description)} {weatherData.current.description}
                </Typography>
                <Typography variant="body2">
                  Humidity: {weatherData.current.humidity}%
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="body2" gutterBottom>
                  7-Day Forecast
                </Typography>
                <Box display="flex" gap={1}>
                  {weatherData.forecast?.slice(0, 5).map((day, index) => (
                    <Paper key={index} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.2)', minWidth: 60 }}>
                      <Typography variant="caption" display="block">
                        {formatDate(day.date)}
                      </Typography>
                      <Typography variant="body2">
                        {Math.round(day.temperature)}°
                      </Typography>
                      <Typography variant="caption">
                        {day.precipitation}mm
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Smart Insights */}
      {insights && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🧠 Smart Garden Insights
            </Typography>
            <Grid container spacing={2}>
              {insights.weather_alerts?.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="warning" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      ⛈️ Weather Alerts
                    </Typography>
                    {insights.weather_alerts.slice(0, 2).map((alert, index) => (
                      <Typography key={index} variant="body2">
                        {alert.message}
                      </Typography>
                    ))}
                  </Alert>
                </Grid>
              )}
              
              {insights.harvest_ready?.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="success" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      🌾 Ready to Harvest
                    </Typography>
                    {insights.harvest_ready.slice(0, 2).map((item, index) => (
                      <Typography key={index} variant="body2">
                        {item.plant}
                      </Typography>
                    ))}
                  </Alert>
                </Grid>
              )}
              
              {insights.pest_alerts?.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="error" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      🐛 Pest Monitoring
                    </Typography>
                    {insights.pest_alerts.slice(0, 2).map((item, index) => (
                      <Typography key={index} variant="body2">
                        {item.plant}
                      </Typography>
                    ))}
                  </Alert>
                </Grid>
              )}
              
              {insights.watering_recommendations?.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="info" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      💧 Watering Due
                    </Typography>
                    {insights.watering_recommendations.slice(0, 2).map((item, index) => (
                      <Typography key={index} variant="body2">
                        {item.plant}
                      </Typography>
                    ))}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Calendar Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Calendar View" />
          <Tab label="Upcoming Tasks" />
          <Tab label="Overdue Tasks" />
        </Tabs>
      </Paper>

      {/* Calendar View */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2, height: 600 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: getEventColor(event.resource.type),
                opacity: event.resource.completed ? 0.5 : 1
              }
            })}
            components={{
              event: ({ event }) => (
                <Box>
                  <Typography variant="caption" display="block">
                    {getEventIcon(event.resource.type)} {event.title}
                  </Typography>
                </Box>
              )
            }}
            views={['month', 'week', 'day']}
            defaultView="month"
          />
        </Paper>
      )}

      {/* Upcoming Tasks */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📅 Upcoming Tasks ({upcomingEvents.length})
            </Typography>
            {upcomingEvents.length === 0 ? (
              <Alert severity="info">
                No upcoming tasks! Consider generating a smart schedule to optimize your garden care.
              </Alert>
            ) : (
              <List>
                {upcomingEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Typography sx={{ fontSize: '1.5rem' }}>
                          {getEventIcon(event.resource.type)}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(event.start)} • {event.resource.type}
                            </Typography>
                            {event.resource.description && (
                              <Typography variant="body2" color="text.secondary">
                                {event.resource.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Chip
                        label={event.resource.type}
                        size="small"
                        sx={{ 
                          bgcolor: getEventColor(event.resource.type),
                          color: 'white'
                        }}
                      />
                    </ListItem>
                    {index < upcomingEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ⚠️ Overdue Tasks ({overdueEvents.length})
            </Typography>
            {overdueEvents.length === 0 ? (
              <Alert severity="success">
                Great job! No overdue tasks. Your garden is well maintained! 🌱✨
              </Alert>
            ) : (
              <List>
                {overdueEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemIcon>
                        <WarningIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="error">
                              Due: {formatDate(event.start)} • {event.resource.type}
                            </Typography>
                            {event.resource.description && (
                              <Typography variant="body2" color="text.secondary">
                                {event.resource.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          // Mark as completed
                          fetch(`http://localhost:5000/api/calendar/${event.id}/complete`, {
                            method: 'POST',
                            credentials: 'include'
                          }).then(() => loadEvents());
                        }}
                      >
                        Mark Done
                      </Button>
                    </ListItem>
                    {index < overdueEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🚀 Generate Smart Garden Schedule</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Our AI will analyze your garden and create an intelligent schedule that includes:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><WaterIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Weather-adjusted watering schedule" secondary="Automatically skips watering when rain is expected" />
            </ListItem>
            <ListItem>
              <ListItemIcon><PlantIcon color="success" /></ListItemIcon>
              <ListItemText primary="Plant-specific care tasks" secondary="Fertilizing, pruning, and harvesting reminders" />
            </ListItem>
            <ListItem>
              <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
              <ListItemText primary="Pest monitoring alerts" secondary="Early warnings for common garden pests" />
            </ListItem>
            <ListItem>
              <ListItemIcon><ScheduleIcon color="info" /></ListItemIcon>
              <ListItemText primary="Optimized timing" secondary="Tasks scheduled based on plant growth stages" />
            </ListItem>
          </List>
          {lastGenerated && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Last schedule generated: {lastGenerated.toLocaleString()}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={generateSmartSchedule}
            variant="contained"
            disabled={scheduleGenerating}
            startIcon={scheduleGenerating ? <LinearProgress /> : <AutoIcon />}
          >
            {scheduleGenerating ? 'Generating...' : 'Generate Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Google Calendar Sync Dialog */}
      <Dialog open={googleSyncDialogOpen} onClose={() => setGoogleSyncDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📅 Sync to Google Calendar</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Sync your garden schedule to Google Calendar for reminders on all your devices!
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            This will create separate calendars for each garden plot and sync all your tasks.
          </Alert>
          
          <List>
            <ListItem>
              <ListItemIcon>📱</ListItemIcon>
              <ListItemText 
                primary="Mobile Reminders" 
                secondary="Get notifications on your phone and watch" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>🎨</ListItemIcon>
              <ListItemText 
                primary="Color-Coded Events" 
                secondary="Different colors for watering, fertilizing, harvesting" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>🔄</ListItemIcon>
              <ListItemText 
                primary="Two-Way Sync" 
                secondary="Mark tasks complete in either app" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>📍</ListItemIcon>
              <ListItemText 
                primary="Plot-Specific Calendars" 
                secondary="Separate calendar for each garden plot" 
              />
            </ListItem>
          </List>
          
          {googleCalendarConnected && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ✅ Google Calendar is connected and ready to sync!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoogleSyncDialogOpen(false)}>Cancel</Button>
          {googleCalendarConnected && (
            <Button
              onClick={disconnectGoogleCalendar}
              color="error"
              sx={{ mr: 1 }}
            >
              Disconnect
            </Button>
          )}
          <Button
            onClick={syncToGoogleCalendar}
            variant="contained"
            disabled={googleSyncing || !googleCalendarConnected}
            startIcon={googleSyncing ? <LinearProgress /> : <CalendarIcon />}
          >
            {googleSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmartGardenCalendar; 