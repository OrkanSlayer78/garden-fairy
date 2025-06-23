import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Badge,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  EmojiObjects as LightbulbIcon,
  Spa as PlantIcon,
} from '@mui/icons-material';
import { plantsAPI } from '../services/api';

const GardenAnalyzer = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  useEffect(() => {
    analyzeGarden();
  }, []);

  const analyzeGarden = async () => {
    setLoading(true);
    try {
      const response = await plantsAPI.analyzeGardenLayout();
      setAnalysis(response.data);
      setLastAnalyzed(new Date());
    } catch (error) {
      console.error('Error analyzing garden:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 5) return 'success';
    if (score >= 0) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score) => {
    if (score >= 5) return <CheckIcon />;
    if (score >= 0) return <WarningIcon />;
    return <ErrorIcon />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Analyzing your garden layout...
        </Typography>
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Box textAlign="center" py={6}>
        <PlantIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No garden data to analyze
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Add some plants to your garden to get compatibility insights
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Garden Layout Analysis 🔍
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Smart compatibility analysis for your garden
          </Typography>
        </Box>
        <Button variant="outlined" onClick={analyzeGarden}>
          Refresh Analysis
        </Button>
      </Box>

      {/* Overall Score Card */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent textAlign="center">
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                {getScoreIcon(analysis.analysis.overall_score)}
                <Typography variant="h4" color={getScoreColor(analysis.analysis.overall_score)} sx={{ ml: 1 }}>
                  {analysis.analysis.overall_score}
                </Typography>
              </Box>
              <Typography variant="h6" gutterBottom>
                Garden Score
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall compatibility rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent textAlign="center">
              <Typography variant="h4" color="primary" gutterBottom>
                {analysis.total_plants}
              </Typography>
              <Typography variant="h6" gutterBottom>
                Plants Analyzed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total plants in garden
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent textAlign="center">
              <Badge 
                badgeContent={analysis.analysis.critical_warnings.length} 
                color="error"
                showZero
              >
                <WarningIcon fontSize="large" />
              </Badge>
              <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
                Critical Issues
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Incompatible plants detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Last analyzed info */}
      {lastAnalyzed && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Last analyzed: {lastAnalyzed.toLocaleString()}
        </Alert>
      )}

      {/* Critical Warnings */}
      {analysis.analysis.critical_warnings.length > 0 && (
        <Accordion defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <ErrorIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Critical Compatibility Issues ({analysis.analysis.critical_warnings.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {analysis.analysis.critical_warnings.map((warning, index) => (
                <ListItem key={index} sx={{ bgcolor: 'error.light', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <WarningIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${warning.plant1} ↔ ${warning.plant2}`}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Distance: {Math.round(warning.distance)}"
                        </Typography>
                        {warning.issues.map((issue, idx) => (
                          <Typography key={idx} variant="body2" color="error">
                            • {issue}
                          </Typography>
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Spacing Issues */}
      {analysis.analysis.compatibility_issues.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Spacing Issues ({analysis.analysis.compatibility_issues.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {analysis.analysis.compatibility_issues.map((issue, index) => (
                <ListItem key={index} sx={{ bgcolor: 'warning.light', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <InfoIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${issue.plant1} ↔ ${issue.plant2}`}
                    secondary={issue.issue}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Benefits */}
      {analysis.analysis.benefits.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <CheckIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Great Plant Combinations ({analysis.analysis.benefits.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {analysis.analysis.benefits.map((benefit, index) => (
                <ListItem key={index} sx={{ bgcolor: 'success.light', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${benefit.plant1} + ${benefit.plant2}`}
                    secondary={benefit.benefit}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Recommendations */}
      {analysis.analysis.recommendations.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <LightbulbIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Recommendations
              </Typography>
            </Box>
            <List>
              {analysis.analysis.recommendations.map((recommendation, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <LightbulbIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={recommendation} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Perfect Garden Message */}
      {analysis.analysis.critical_warnings.length === 0 && 
       analysis.analysis.compatibility_issues.length === 0 && 
       analysis.analysis.overall_score > 5 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎉 Congratulations! Your garden layout is excellent!
          </Typography>
          <Typography>
            Your plants are well-spaced and have great companion relationships. 
            Keep up the fantastic gardening!
          </Typography>
        </Alert>
      )}

      {/* Quick Tips */}
      <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          💡 Garden Layout Tips
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              <strong>Companion Planting:</strong> Some plants naturally help each other grow better
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              <strong>Proper Spacing:</strong> Give plants enough room to prevent competition
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              <strong>Pest Management:</strong> Avoid planting susceptible plants too close together
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              <strong>Regular Analysis:</strong> Re-check your layout when adding new plants
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default GardenAnalyzer; 