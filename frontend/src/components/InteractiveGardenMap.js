import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Fab, Tooltip, Alert, Typography, Paper, IconButton } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Satellite as SatelliteIcon, Map as MapIcon } from '@mui/icons-material';
import { loadGoogleMaps, isGoogleMapsAvailable } from '../utils/googleMaps';
import PlantDetailDialog from './PlantDetailDialog';

const InteractiveGardenMap = ({ 
  gardenLocation, 
  plots = [], 
  onPlotCreate, 
  onPlotUpdate, 
  onPlotDelete,
  plantPlacements = [],
  onPlantPlace,
  onPlantUpdate,
  onPlantDelete,
  isDragMode = false,
  showPlantTools = true
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const plotPolygonsRef = useRef(new Map());
  const plantMarkersRef = useRef(new Map());
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapType, setMapType] = useState('satellite');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);

  const [plantDetailOpen, setPlantDetailOpen] = useState(false);
  const [selectedPlantDetail, setSelectedPlantDetail] = useState(null);


  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!isGoogleMapsAvailable() || !gardenLocation) return;

      try {
        const google = await loadGoogleMaps();
        
        const map = new google.maps.Map(mapRef.current, {
          center: { 
            lat: gardenLocation.latitude, 
            lng: gardenLocation.longitude 
          },
          zoom: 18,
          mapTypeId: google.maps.MapTypeId.SATELLITE,
          mapTypeControl: true,
          mapTypeControlOptions: {
            mapTypeIds: [
              google.maps.MapTypeId.SATELLITE,
              google.maps.MapTypeId.ROADMAP,
              google.maps.MapTypeId.HYBRID
            ]
          },
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Initialize Drawing Manager
        const drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false,
          polygonOptions: {
            fillColor: '#4CAF50',
            fillOpacity: 0.3,
            strokeColor: '#2E7D32',
            strokeWeight: 2,
            editable: true,
            draggable: true,
          },
        });

        drawingManager.setMap(map);

        // Handle polygon completion
        google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
          handlePolygonComplete(polygon);
          setIsDrawing(false);
          drawingManager.setDrawingMode(null);
        });

        mapInstanceRef.current = map;
        drawingManagerRef.current = drawingManager;

        // Map state tracking removed - not needed for current functionality

        setMapLoaded(true);

        // Load existing plots
        loadExistingPlots(google, map);
        
        // Load existing plant placements only if plant tools are enabled
        if (showPlantTools) {
          loadPlantPlacements(google, map);
        }

      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      }
    };

    initMap();
  }, [gardenLocation]);

  // Load existing plots as polygons
  const loadExistingPlots = useCallback((google, map) => {
    plots.forEach(plot => {
      if (plot.coordinates && plot.coordinates.length > 0) {
        // Check if plot has plants - if so, make it non-editable for safety
        const hasPlants = plot.plant_count > 0;
        const isProtected = hasPlants;
        
        const polygon = new google.maps.Polygon({
          paths: plot.coordinates,
          fillColor: isProtected ? '#FF9800' : '#4CAF50', // Orange if protected
          fillOpacity: isProtected ? 0.2 : 0.3,
          strokeColor: isProtected ? '#F57C00' : '#2E7D32',
          strokeWeight: isProtected ? 3 : 2,
          editable: !isProtected, // Non-editable if has plants
          draggable: !isProtected, // Non-draggable if has plants
        });

        polygon.setMap(map);
        plotPolygonsRef.current.set(plot.id, polygon);

        // Add click listener to select plot
        google.maps.event.addListener(polygon, 'click', () => {
          setSelectedPlot(plot);
          highlightPolygon(polygon);
          
          // Show protection message if plot has plants
          if (isProtected) {
            alert(`🔒 Plot "${plot.name}" is protected because it contains ${plot.plant_count} plant(s). Remove plants first to edit the plot boundaries.`);
          }
        });

        // Only add edit listeners for non-protected plots
        if (!isProtected) {
          // Add drag listener to update coordinates
          google.maps.event.addListener(polygon, 'dragend', () => {
            updatePlotCoordinates(plot.id, polygon);
          });

          // Add edit listener for path changes
          google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
            updatePlotCoordinates(plot.id, polygon);
          });

          google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
            updatePlotCoordinates(plot.id, polygon);
          });
        }
      }
    });
  }, [plots]);

  // Handle new polygon creation
  const handlePolygonComplete = useCallback((polygon) => {
    const coordinates = polygon.getPath().getArray().map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));

    // Calculate approximate center and dimensions
    const bounds = new window.google.maps.LatLngBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    const center = bounds.getCenter();
    
    // Rough calculation of dimensions in feet (1 degree ≈ 364,000 feet at equator)
    const latSpan = bounds.getNorthEast().lat() - bounds.getSouthWest().lat();
    const lngSpan = bounds.getNorthEast().lng() - bounds.getSouthWest().lng();
    const width = Math.round(lngSpan * 364000);
    const height = Math.round(latSpan * 364000);

    const plotData = {
      name: `Garden Plot ${plots.length + 1}`,
      coordinates: coordinates,
      center_x: center.lng(),
      center_y: center.lat(),
      width: width,
      height: height,
      soil_quality: 'good',
      sun_exposure: 'full_sun',
      irrigation_type: 'manual',
      garden_location_id: gardenLocation.id
    };

    // Add event listeners to new polygon
    window.google.maps.event.addListener(polygon, 'click', () => {
      setSelectedPlot(plotData);
      highlightPolygon(polygon);
    });

    onPlotCreate(plotData);
  }, [plots.length, gardenLocation, onPlotCreate]);

  // Update plot coordinates when moved/edited
  const updatePlotCoordinates = useCallback((plotId, polygon) => {
    const coordinates = polygon.getPath().getArray().map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));

    const bounds = new window.google.maps.LatLngBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    const center = bounds.getCenter();

    onPlotUpdate(plotId, {
      coordinates: coordinates,
      center_x: center.lng(),
      center_y: center.lat()
    });
  }, [onPlotUpdate]);

  // Load existing plant placements as markers
  const loadPlantPlacements = useCallback((google, map) => {
    plantPlacements.forEach(placement => {
      createPlantMarker(google, map, placement);
    });
  }, [plantPlacements]);

  // Create plant marker on map
  const createPlantMarker = useCallback((google, map, placement) => {
    // Create a more prominent circular background marker
    const marker = new google.maps.Marker({
      position: { lat: placement.latitude, lng: placement.longitude },
      map: map,
      title: `${placement.plant_name} (${placement.variety || 'Standard'})`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: placement.plant_color || '#4CAF50',
        fillOpacity: 0.9,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
        scale: 20
      },
      draggable: true,
      zIndex: 1000
    });

    // Add enhanced plant emoji overlay
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = function() {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.cursor = 'pointer';
      container.style.userSelect = 'none';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.width = '40px';
      container.style.height = '40px';
      container.style.borderRadius = '50%';
      container.style.backgroundColor = placement.plant_color || '#4CAF50';
      container.style.border = '3px solid white';
      container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      container.style.transition = 'all 0.2s ease';
      container.style.zIndex = '1001';
      
      const icon = document.createElement('div');
      icon.style.fontSize = '20px';
      icon.style.lineHeight = '1';
      icon.innerHTML = placement.plant_icon || '🌱';
      
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.top = '45px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.fontSize = '10px';
      label.style.fontWeight = 'bold';
      label.style.backgroundColor = 'rgba(0,0,0,0.8)';
      label.style.color = 'white';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '8px';
      label.style.whiteSpace = 'nowrap';
      label.style.display = 'none';
      label.innerHTML = placement.plant_name;
      
      container.appendChild(icon);
      container.appendChild(label);
      
      // Enhanced click handler to open detail dialog
      container.onclick = (e) => {
        e.stopPropagation();
        setSelectedPlantDetail(placement);
        setPlantDetailOpen(true);
        highlightPlantMarker(marker);
      };
      
      // Hover effects
      container.onmouseenter = () => {
        container.style.transform = 'scale(1.1)';
        container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        label.style.display = 'block';
      };
      
      container.onmouseleave = () => {
        container.style.transform = 'scale(1)';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        label.style.display = 'none';
      };
      
      this.div = container;
      const panes = this.getPanes();
      panes.overlayMouseTarget.appendChild(container);
    };
    
    overlay.draw = function() {
      const projection = this.getProjection();
      if (!projection || !this.div) return;
      
      // Use the placement coordinates directly instead of marker position
      const latLng = new window.google.maps.LatLng(placement.latitude, placement.longitude);
      const position = projection.fromLatLngToDivPixel(latLng);
      if (!position) return;
      
      this.div.style.left = (position.x - 20) + 'px';
      this.div.style.top = (position.y - 20) + 'px';
    };
    
    overlay.onRemove = function() {
      if (this.div) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    };
    
    overlay.setMap(map);

    // Store marker and overlay references
    plantMarkersRef.current.set(placement.id, { marker, overlay });

    // Add drag listener
    google.maps.event.addListener(marker, 'dragend', () => {
      const newPos = marker.getPosition();
      onPlantUpdate?.(placement.id, {
        latitude: newPos.lat(),
        longitude: newPos.lng()
      });
    });

    // Add click listener to marker as well
    google.maps.event.addListener(marker, 'click', () => {
      setSelectedPlantDetail(placement);
      setPlantDetailOpen(true);
      highlightPlantMarker(marker);
    });

    return marker;
  }, [onPlantUpdate]);

  // Highlight selected plant marker
  const highlightPlantMarker = useCallback((selectedMarker) => {
    // Reset all markers to normal
    plantMarkersRef.current.forEach(({ marker }) => {
      marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#4CAF50',
        fillOpacity: 0.8,
        strokeColor: '#2E7D32',
        strokeWeight: 2,
        scale: 8
      });
    });

    // Highlight selected marker
    selectedMarker.setIcon({
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: '#FF5722',
      fillOpacity: 0.9,
      strokeColor: '#D32F2F',
      strokeWeight: 3,
      scale: 10
    });
  }, []);

  // Check if point is inside any plot
  const isPointInPlot = useCallback((latLng) => {
    for (let plot of plots) {
      if (plot.coordinates && plot.coordinates.length > 0) {
        if (window.google && window.google.maps.geometry) {
          const polygon = new window.google.maps.Polygon({
            paths: plot.coordinates
          });
          if (window.google.maps.geometry.poly.containsLocation(latLng, polygon)) {
            return plot;
          }
        }
      }
    }
    return null;
  }, [plots]);

  // Handle plant drop on map
  const handlePlantDrop = useCallback((e) => {
    e.preventDefault();
    
    if (!mapInstanceRef.current) return;
    
    try {
      const plantData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Get drop coordinates
      const bounds = mapRef.current.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      
      // Convert pixel coordinates to lat/lng
      const projection = mapInstanceRef.current.getProjection();
      if (!projection) return;
      
      const topRight = mapInstanceRef.current.getBounds().getNorthEast();
      const bottomLeft = mapInstanceRef.current.getBounds().getSouthWest();
      
      const worldCoordinate = projection.fromLatLngToPoint(new window.google.maps.LatLng(
        topRight.lat() - (y / bounds.height) * (topRight.lat() - bottomLeft.lat()),
        bottomLeft.lng() + (x / bounds.width) * (topRight.lng() - bottomLeft.lng())
      ));
      
      const latLng = projection.fromPointToLatLng(worldCoordinate);
      
      // Check if dropped inside a plot
      const plot = isPointInPlot(latLng);
      if (!plot) {
        alert('Plants must be placed inside a garden plot!');
        return;
      }
      
      // Check spacing requirements (simplified)
      const spacingMeters = (plantData.spacing_inches * 0.0254); // Convert inches to meters
      const tooClose = plantPlacements.some(placement => {
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
          latLng,
          new window.google.maps.LatLng(placement.latitude, placement.longitude)
        );
        return distance < spacingMeters;
      });
      
      if (tooClose) {
        alert(`Plants must be at least ${plantData.spacing_inches}" apart!`);
        return;
      }
      
      // Create plant placement
      const placementData = {
        plant_type_id: plantData.id,
        plant_name: plantData.name,
        plant_icon: plantData.icon,
        plant_color: plantData.color,
        plot_id: plot.id,
        latitude: latLng.lat(),
        longitude: latLng.lng(),
        planted_date: new Date().toISOString().split('T')[0],
        spacing_inches: plantData.spacing_inches,
        sun_requirement: plantData.sun_requirement,
        water_requirement: plantData.water_requirement,
        days_to_harvest: plantData.days_to_harvest,
        scientific_name: plantData.scientific_name,
        description: plantData.description,
        category: plantData.category
      };
      
      onPlantPlace?.(placementData);
      
    } catch (error) {
      console.error('Error placing plant:', error);
    }
  }, [plots, plantPlacements, onPlantPlace, isPointInPlot]);

  // Highlight selected polygon
  const highlightPolygon = useCallback((selectedPolygon) => {
    // Reset all polygons to normal
    plotPolygonsRef.current.forEach(polygon => {
      polygon.setOptions({
        fillColor: '#4CAF50',
        strokeColor: '#2E7D32',
        strokeWeight: 2
      });
    });

    // Highlight selected polygon
    selectedPolygon.setOptions({
      fillColor: '#FF5722',
      strokeColor: '#D32F2F',
      strokeWeight: 3
    });
  }, []);

  // Start drawing mode
  const startDrawing = useCallback(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      setIsDrawing(true);
    }
  }, []);

  // Delete selected plot
  const deleteSelectedPlot = useCallback(() => {
    if (selectedPlot) {
      const polygon = plotPolygonsRef.current.get(selectedPlot.id);
      if (polygon) {
        polygon.setMap(null);
        plotPolygonsRef.current.delete(selectedPlot.id);
      }
      onPlotDelete(selectedPlot.id);
      setSelectedPlot(null);
    }
  }, [selectedPlot, onPlotDelete]);

  // Toggle map type
  const toggleMapType = useCallback(() => {
    if (mapInstanceRef.current) {
      const newType = mapType === 'satellite' ? 'roadmap' : 'satellite';
      mapInstanceRef.current.setMapTypeId(
        newType === 'satellite' 
          ? window.google.maps.MapTypeId.SATELLITE 
          : window.google.maps.MapTypeId.ROADMAP
      );
      setMapType(newType);
    }
  }, [mapType]);

  if (!isGoogleMapsAvailable()) {
    return (
      <Alert severity="warning">
        <Typography variant="h6">Google Maps API Key Required</Typography>
        <Typography variant="body2">
          To use the interactive satellite map with polygon drawing, please add your Google Maps API key to the REACT_APP_GOOGLE_MAPS_API_KEY environment variable.
        </Typography>
      </Alert>
    );
  }

  if (!gardenLocation) {
    return (
      <Alert severity="info">
        <Typography variant="body1">
          Please set your garden location first to use the interactive map.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: 600, width: '100%' }}>
      {/* Map Container */}
      <Box
        ref={mapRef}
        sx={{ 
          height: '100%', 
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          border: isDragMode ? '3px dashed #1976d2' : 'none'
        }}
        onDragOver={(e) => {
          if (showPlantTools) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={showPlantTools ? handlePlantDrop : undefined}
      />

      {/* Map Controls */}
      <Paper 
        sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Tooltip title={`Switch to ${mapType === 'satellite' ? 'Map' : 'Satellite'} View`}>
          <IconButton onClick={toggleMapType} size="small">
            {mapType === 'satellite' ? <MapIcon /> : <SatelliteIcon />}
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Drawing Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          gap: 1
        }}
      >
        <Tooltip title="Draw New Garden Plot">
          <Fab
            color="primary"
            size="medium"
            onClick={startDrawing}
            disabled={isDrawing}
            sx={{ 
              bgcolor: isDrawing ? 'action.disabled' : 'primary.main'
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>

        {selectedPlot && (
          <Tooltip title={`Delete ${selectedPlot.name}`}>
            <Fab
              color="error"
              size="medium"
              onClick={deleteSelectedPlot}
            >
              <DeleteIcon />
            </Fab>
          </Tooltip>
        )}

        {selectedPlant && (
          <Tooltip title={`Delete ${selectedPlant.plant_name}`}>
            <Fab
              color="error"
              size="medium"
              onClick={() => {
                onPlantDelete?.(selectedPlant.id);
                setSelectedPlant(null);
              }}
              sx={{ ml: 1 }}
            >
              <DeleteIcon />
            </Fab>
          </Tooltip>
        )}
      </Box>

      {/* Instructions */}
      {isDrawing && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 2,
            bgcolor: 'primary.main',
            color: 'white'
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            🖱️ Click on the map to draw your garden plot boundary
          </Typography>
          <Typography variant="caption">
            Click multiple points to create a polygon, then click the first point to complete
          </Typography>
        </Paper>
      )}

      {selectedPlot && !selectedPlant && !isDrawing && !isDragMode && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 2,
            bgcolor: 'success.main',
            color: 'white'
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            ✨ Selected: {selectedPlot.name}
          </Typography>
          <Typography variant="caption">
            Drag to move • Drag corners to resize • Click delete button to remove
          </Typography>
        </Paper>
      )}

      {selectedPlant && !isDrawing && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 2,
            bgcolor: 'secondary.main',
            color: 'white'
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            🌱 Selected: {selectedPlant.plant_name}
          </Typography>
          <Typography variant="caption">
            Drag to move • Click delete button to remove
          </Typography>
        </Paper>
      )}

      {isDragMode && !isDrawing && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 2,
            bgcolor: 'info.main',
            color: 'white'
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            🌱 Drop Plant Here!
          </Typography>
          <Typography variant="caption">
            Drag from plant library and drop inside any garden plot
          </Typography>
        </Paper>
      )}

      {!mapLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="h6">Loading Interactive Map...</Typography>
        </Box>
      )}

      {/* Plant Detail Dialog */}
      <PlantDetailDialog
        open={plantDetailOpen}
        onClose={() => {
          setPlantDetailOpen(false);
          setSelectedPlantDetail(null);
        }}
        plantPlacement={selectedPlantDetail}
        onUpdatePlacement={onPlantUpdate}
        onDeletePlacement={onPlantDelete}
      />
    </Box>
  );
};

export default InteractiveGardenMap; 