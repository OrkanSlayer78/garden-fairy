import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Agriculture as EcoIcon,
  WbSunny as SunIcon,
  Opacity as WaterIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const PlantPalette = ({ onPlantDragStart, onPlantDragEnd }) => {
  const [plants, setPlants] = useState([]);
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('vegetables');
  const [loading, setLoading] = useState(true);
  const [draggedPlant, setDraggedPlant] = useState(null);

  // Load available plants
  useEffect(() => {
    const loadPlants = async () => {
      try {
        // For now, using mock plant data. In production, this would come from your backend
        const mockPlants = [
          // Vegetables
          {
            id: 1,
            name: 'Tomato',
            scientific_name: 'Solanum lycopersicum',
            category: 'vegetables',
            planting_season: 'spring',
            days_to_harvest: 80,
            spacing_inches: 24,
            sun_requirement: 'full',
            water_requirement: 'medium',
            description: 'Classic garden tomato, perfect for salads and cooking',
            icon: '🍅',
            color: '#FF6B6B'
          },
          {
            id: 2,
            name: 'Lettuce',
            scientific_name: 'Lactuca sativa',
            category: 'vegetables',
            planting_season: 'spring',
            days_to_harvest: 45,
            spacing_inches: 8,
            sun_requirement: 'partial',
            water_requirement: 'high',
            description: 'Fast-growing leafy green, great for continuous harvest',
            icon: '🥬',
            color: '#51CF66'
          },
          {
            id: 3,
            name: 'Carrot',
            scientific_name: 'Daucus carota',
            category: 'vegetables',
            planting_season: 'spring',
            days_to_harvest: 70,
            spacing_inches: 3,
            sun_requirement: 'full',
            water_requirement: 'medium',
            description: 'Root vegetable that stores well, loves loose soil',
            icon: '🥕',
            color: '#FF9500'
          },
          {
            id: 4,
            name: 'Bell Pepper',
            scientific_name: 'Capsicum annuum',
            category: 'vegetables',
            planting_season: 'spring',
            days_to_harvest: 75,
            spacing_inches: 18,
            sun_requirement: 'full',
            water_requirement: 'medium',
            description: 'Colorful sweet peppers, excellent fresh or cooked',
            icon: '🫑',
            color: '#FFE066'
          },
          // Herbs
          {
            id: 5,
            name: 'Basil',
            scientific_name: 'Ocimum basilicum',
            category: 'herbs',
            planting_season: 'spring',
            days_to_harvest: 60,
            spacing_inches: 12,
            sun_requirement: 'full',
            water_requirement: 'medium',
            description: 'Aromatic herb perfect for Italian dishes and pesto',
            icon: '🌿',
            color: '#51CF66'
          },
          {
            id: 6,
            name: 'Rosemary',
            scientific_name: 'Rosmarinus officinalis',
            category: 'herbs',
            planting_season: 'spring',
            days_to_harvest: 90,
            spacing_inches: 24,
            sun_requirement: 'full',
            water_requirement: 'low',
            description: 'Perennial herb with needle-like leaves, very drought tolerant',
            icon: '🌲',
            color: '#099268'
          },
          {
            id: 7,
            name: 'Mint',
            scientific_name: 'Mentha',
            category: 'herbs',
            planting_season: 'spring',
            days_to_harvest: 50,
            spacing_inches: 15,
            sun_requirement: 'partial',
            water_requirement: 'high',
            description: 'Fast-spreading herb, great for teas and garnishes',
            icon: '🌱',
            color: '#20C997'
          },
          // Flowers
          {
            id: 8,
            name: 'Marigold',
            scientific_name: 'Tagetes',
            category: 'flowers',
            planting_season: 'spring',
            days_to_harvest: 50,
            spacing_inches: 10,
            sun_requirement: 'full',
            water_requirement: 'low',
            description: 'Bright companion flowers that repel garden pests',
            icon: '🌼',
            color: '#FFD43B'
          },
          {
            id: 9,
            name: 'Sunflower',
            scientific_name: 'Helianthus annuus',
            category: 'flowers',
            planting_season: 'spring',
            days_to_harvest: 80,
            spacing_inches: 36,
            sun_requirement: 'full',
            water_requirement: 'medium',
            description: 'Tall, cheerful flowers that attract beneficial insects',
            icon: '🌻',
            color: '#FFD43B'
          },
          {
            id: 10,
            name: 'Zinnia',
            scientific_name: 'Zinnia elegans',
            category: 'flowers',
            planting_season: 'spring',
            days_to_harvest: 60,
            spacing_inches: 12,
            sun_requirement: 'full',
            water_requirement: 'medium',
            description: 'Colorful, long-lasting cut flowers in many varieties',
            icon: '🌺',
            color: '#F783AC'
          }
        ];

        setPlants(mockPlants);
        setFilteredPlants(mockPlants);
        setLoading(false);
      } catch (error) {
        console.error('Error loading plants:', error);
        setLoading(false);
      }
    };

    loadPlants();
  }, []);

  // Filter plants based on search term
  useEffect(() => {
    const filtered = plants.filter(plant =>
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.scientific_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPlants(filtered);
  }, [searchTerm, plants]);

  // Group plants by category
  const plantsByCategory = filteredPlants.reduce((acc, plant) => {
    if (!acc[plant.category]) {
      acc[plant.category] = [];
    }
    acc[plant.category].push(plant);
    return acc;
  }, {});

  // Handle drag start
  const handleDragStart = (e, plant) => {
    setDraggedPlant(plant);
    e.dataTransfer.setData('application/json', JSON.stringify(plant));
    e.dataTransfer.effectAllowed = 'copy';
    onPlantDragStart?.(plant);
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    setDraggedPlant(null);
    onPlantDragEnd?.();
  };

  // Get sun requirement icon
  const getSunIcon = (requirement) => {
    switch (requirement) {
      case 'full': return '☀️';
      case 'partial': return '⛅';
      case 'shade': return '🌤️';
      default: return '☀️';
    }
  };

  // Get water requirement color
  const getWaterColor = (requirement) => {
    switch (requirement) {
      case 'low': return '#FFA94D';
      case 'medium': return '#74C0FC';
      case 'high': return '#339AF0';
      default: return '#74C0FC';
    }
  };

  if (loading) {
    return (
      <Box p={2}>
        <Typography>Loading plant library...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <EcoIcon sx={{ mr: 1, color: 'success.main' }} />
        🌱 Plant Library
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search plants..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
        <strong>🖱️ Drag & Drop:</strong> Drag plants onto your garden map to place them!
      </Alert>

      {/* Plant Categories */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {Object.entries(plantsByCategory).map(([category, categoryPlants]) => (
          <Accordion
            key={category}
            expanded={expandedCategory === category}
            onChange={() => setExpandedCategory(expandedCategory === category ? '' : category)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                {category} ({categoryPlants.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              <Grid container spacing={1}>
                {categoryPlants.map((plant) => (
                  <Grid item xs={12} key={plant.id}>
                    <Card
                      draggable
                      onDragStart={(e) => handleDragStart(e, plant)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        cursor: 'grab',
                        transition: 'all 0.2s',
                        border: draggedPlant?.id === plant.id ? '2px dashed #1976d2' : '1px solid #e0e0e0',
                        opacity: draggedPlant?.id === plant.id ? 0.7 : 1,
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)'
                        },
                        '&:active': {
                          cursor: 'grabbing'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar
                            sx={{
                              bgcolor: plant.color,
                              width: 32,
                              height: 32,
                              mr: 1,
                              fontSize: '1.2rem'
                            }}
                          >
                            {plant.icon}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {plant.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {plant.scientific_name}
                            </Typography>
                          </Box>
                          <Tooltip title={plant.description}>
                            <IconButton size="small">
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Tooltip title={`${plant.sun_requirement} sun`}>
                            <Chip
                              size="small"
                              label={getSunIcon(plant.sun_requirement)}
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </Tooltip>
                          <Tooltip title={`${plant.water_requirement} water`}>
                            <Chip
                              size="small"
                              icon={<WaterIcon sx={{ fontSize: '0.8rem' }} />}
                              label={plant.water_requirement}
                              sx={{
                                fontSize: '0.6rem',
                                height: 20,
                                bgcolor: getWaterColor(plant.water_requirement),
                                color: 'white'
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={`${plant.days_to_harvest} days to harvest`}>
                            <Chip
                              size="small"
                              icon={<ScheduleIcon sx={{ fontSize: '0.8rem' }} />}
                              label={`${plant.days_to_harvest}d`}
                              sx={{ fontSize: '0.6rem', height: 20 }}
                            />
                          </Tooltip>
                          <Tooltip title={`${plant.spacing_inches}" spacing`}>
                            <Chip
                              size="small"
                              label={`${plant.spacing_inches}"`}
                              sx={{ fontSize: '0.6rem', height: 20, bgcolor: '#E3F2FD' }}
                            />
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default PlantPalette; 