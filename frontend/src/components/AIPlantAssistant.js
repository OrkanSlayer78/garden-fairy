import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload,
  SmartToy,
  PhotoCamera,
  LocalFlorist,
  Healing,
  Map,
  QuestionAnswer,
  CheckCircle,
  Warning,
  Close,
} from '@mui/icons-material';
import { aiAPI } from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AIPlantAssistant = ({ open, onClose, plantData = null }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  // Plant ID tab state
  const [plantIdFile, setPlantIdFile] = useState(null);
  const [plantIdPreview, setPlantIdPreview] = useState('');
  
  // Health Check tab state
  const [healthFile, setHealthFile] = useState(null);
  const [healthPreview, setHealthPreview] = useState('');
  const [symptoms, setSymptoms] = useState('');
  
  // Garden AI tab state
  const [location, setLocation] = useState('');
  const [gardenType, setGardenType] = useState('');
  const [experience, setExperience] = useState('');
  
  // Care Helper tab state
  const [question, setQuestion] = useState('');
  const [plantName, setPlantName] = useState(plantData?.name || '');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setResults(null);
    setError('');
  };

  const handleFileSelect = (file, type) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'plantId') {
          setPlantIdPreview(e.target.result);
          setPlantIdFile(file);
        } else if (type === 'health') {
          setHealthPreview(e.target.result);
          setHealthFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlantIdentification = async () => {
    if (!plantIdFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', plantIdFile);
      
      const response = await aiAPI.identifyPlant(formData);
      setResults(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to identify plant');
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!healthFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', healthFile);
      if (symptoms) formData.append('symptoms', symptoms);
      
      const response = await aiAPI.analyzeHealth(formData);
      setResults(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze plant health');
    } finally {
      setLoading(false);
    }
  };

  const handleGardenPlanning = async () => {
    if (!location || !gardenType || !experience) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await aiAPI.getGardenAdvice({
        location,
        garden_type: gardenType,
        experience_level: experience
      });
      setResults(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get garden advice');
    } finally {
      setLoading(false);
    }
  };

  const handleCareQuestion = async () => {
    if (!question) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await aiAPI.askCareQuestion({
        question,
        plant_name: plantName,
        plant_data: plantData
      });
      setResults(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get plant care advice');
    } finally {
      setLoading(false);
    }
  };

  const renderPlantIdResults = () => {
    if (!results) return null;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🌱 Plant Identification Results
          </Typography>
          {results.species && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                <strong>{results.species}</strong>
              </Typography>
              {results.common_names && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Common names: {results.common_names.join(', ')}
                </Typography>
              )}
              {results.confidence && (
                <Chip 
                  label={`${Math.round(results.confidence * 100)}% confidence`}
                  color={results.confidence > 0.7 ? 'success' : results.confidence > 0.4 ? 'warning' : 'error'}
                  size="small"
                />
              )}
            </Box>
          )}
          
          {results.plant_info && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Plant Information:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {results.plant_info}
              </Typography>
            </Box>
          )}
          
          {results.care_tips && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Care Tips:</Typography>
              <List dense>
                {results.care_tips.map((tip, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={tip} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderHealthResults = () => {
    if (!results) return null;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🏥 Health Analysis Results
          </Typography>
          
          {results.health_status && (
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={results.health_status}
                color={
                  results.health_status.toLowerCase().includes('healthy') ? 'success' :
                  results.health_status.toLowerCase().includes('warning') ? 'warning' : 'error'
                }
                icon={
                  results.health_status.toLowerCase().includes('healthy') ? <CheckCircle /> :
                  results.health_status.toLowerCase().includes('warning') ? <Warning /> : <Warning />
                }
              />
            </Box>
          )}
          
          {results.issues && results.issues.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Identified Issues:</Typography>
              <List dense>
                {results.issues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={issue} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {results.recommendations && results.recommendations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Treatment Recommendations:</Typography>
              <List dense>
                {results.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Healing color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {results.analysis && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Detailed Analysis:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {results.analysis}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderGardenResults = () => {
    if (!results) return null;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🌻 Garden Planning Advice
          </Typography>
          
          {results.recommended_plants && results.recommended_plants.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Recommended Plants:</Typography>
              <Grid container spacing={1}>
                {results.recommended_plants.map((plant, index) => (
                  <Grid item key={index}>
                    <Chip label={plant} color="primary" variant="outlined" size="small" />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          {results.seasonal_advice && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Seasonal Advice:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {results.seasonal_advice}
              </Typography>
            </Box>
          )}
          
          {results.tips && results.tips.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Gardening Tips:</Typography>
              <List dense>
                {results.tips.map((tip, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <LocalFlorist color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={tip} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {results.advice && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Personalized Advice:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {results.advice}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCareResults = () => {
    if (!results) return null;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Plant Care Advice
          </Typography>
          
          {results.answer && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {results.answer}
              </Typography>
            </Box>
          )}
          
          {results.care_tips && results.care_tips.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Additional Care Tips:</Typography>
              <List dense>
                {results.care_tips.map((tip, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={tip} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {results.warnings && results.warnings.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Important Warnings:</Typography>
              <List dense>
                {results.warnings.map((warning, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={warning} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        background: 'linear-gradient(45deg, #9c27b0 30%, #673ab7 90%)',
        color: 'white'
      }}>
        <SmartToy />
        🤖 AI Plant Assistant
        {plantData && (
          <Chip 
            label={`Analyzing: ${plantData.name}`}
            sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            size="small"
          />
        )}
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="🔍 Plant ID" icon={<PhotoCamera />} />
          <Tab label="🏥 Health Check" icon={<Healing />} />
          <Tab label="🌻 Garden AI" icon={<Map />} />
          <Tab label="💬 Care Helper" icon={<QuestionAnswer />} />
        </Tabs>
      </Box>

      <DialogContent sx={{ minHeight: '400px' }}>
        {/* Plant Identification Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            📸 Upload a plant photo for identification
          </Typography>
          
          <Paper sx={{ p: 2, textAlign: 'center', border: '2px dashed #ccc', mb: 2 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files[0], 'plantId')}
              style={{ display: 'none' }}
              id="plant-id-upload"
            />
            <label htmlFor="plant-id-upload">
              <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                Choose Image
              </Button>
            </label>
            
            {plantIdPreview && (
              <Box sx={{ mt: 2 }}>
                <img 
                  src={plantIdPreview} 
                  alt="Plant to identify" 
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                />
              </Box>
            )}
          </Paper>
          
          <Button
            variant="contained"
            onClick={handlePlantIdentification}
            disabled={!plantIdFile || loading}
            fullWidth
            startIcon={loading ? <CircularProgress size={20} /> : <LocalFlorist />}
          >
            {loading ? 'Identifying Plant...' : 'Identify Plant'}
          </Button>
          
          {renderPlantIdResults()}
        </TabPanel>

        {/* Health Check Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            🏥 Upload a photo for health analysis
          </Typography>
          
          <Paper sx={{ p: 2, textAlign: 'center', border: '2px dashed #ccc', mb: 2 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files[0], 'health')}
              style={{ display: 'none' }}
              id="health-upload"
            />
            <label htmlFor="health-upload">
              <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                Choose Image
              </Button>
            </label>
            
            {healthPreview && (
              <Box sx={{ mt: 2 }}>
                <img 
                  src={healthPreview} 
                  alt="Plant health check" 
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                />
              </Box>
            )}
          </Paper>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Describe symptoms (optional)"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g., yellowing leaves, brown spots, wilting..."
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={handleHealthCheck}
            disabled={!healthFile || loading}
            fullWidth
            startIcon={loading ? <CircularProgress size={20} /> : <Healing />}
          >
            {loading ? 'Analyzing Health...' : 'Analyze Plant Health'}
          </Button>
          
          {renderHealthResults()}
        </TabPanel>

        {/* Garden Planning Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            🌻 Get personalized garden advice
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Your Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., California, USA"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Garden Type</InputLabel>
                <Select
                  value={gardenType}
                  onChange={(e) => setGardenType(e.target.value)}
                  label="Garden Type"
                >
                  <MenuItem value="vegetable">Vegetable Garden</MenuItem>
                  <MenuItem value="flower">Flower Garden</MenuItem>
                  <MenuItem value="herb">Herb Garden</MenuItem>
                  <MenuItem value="mixed">Mixed Garden</MenuItem>
                  <MenuItem value="container">Container Garden</MenuItem>
                  <MenuItem value="indoor">Indoor Garden</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Experience Level</InputLabel>
                <Select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  label="Experience Level"
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Button
            variant="contained"
            onClick={handleGardenPlanning}
            disabled={!location || !gardenType || !experience || loading}
            fullWidth
            startIcon={loading ? <CircularProgress size={20} /> : <Map />}
          >
            {loading ? 'Planning Garden...' : 'Get Garden Advice'}
          </Button>
          
          {renderGardenResults()}
        </TabPanel>

        {/* Care Helper Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            💬 Ask about plant care
          </Typography>
          
          <TextField
            fullWidth
            label="Plant Name (optional)"
            value={plantName}
            onChange={(e) => setPlantName(e.target.value)}
            placeholder="e.g., Monstera deliciosa"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., How often should I water my monstera? Why are the leaves turning yellow?"
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={handleCareQuestion}
            disabled={!question || loading}
            fullWidth
            startIcon={loading ? <CircularProgress size={20} /> : <QuestionAnswer />}
          >
            {loading ? 'Getting Answer...' : 'Ask AI Assistant'}
          </Button>
          
          {renderCareResults()}
        </TabPanel>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<Close />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIPlantAssistant; 