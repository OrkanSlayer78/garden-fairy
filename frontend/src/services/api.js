import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  googleAuth: (token) => api.post('/auth/google', { token }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/user'),
  checkAuth: () => api.get('/auth/check'),
};

// Plants API
export const plantsAPI = {
  getPlantTypes: () => api.get('/api/plant-types'),
  createPlantType: (data) => api.post('/api/plant-types', data),
  getPlants: () => api.get('/api/plants'),
  createPlant: (data) => api.post('/api/plants', data),
  getPlant: (id) => api.get(`/api/plants/${id}`),
  updatePlant: (id, data) => api.put(`/api/plants/${id}`, data),
  deletePlant: (id) => api.delete(`/api/plants/${id}`),
  getPlantStats: () => api.get('/api/plants/stats'),
  
  // Plant intelligence features
  checkCompatibility: (plantId1, plantId2) => api.get(`/api/plants/${plantId1}/compatibility/${plantId2}`),
  getExternalPlantInfo: (plantName) => api.get(`/api/plants/external-info/${encodeURIComponent(plantName)}`),
  getCompanionInfo: (plantName) => api.get(`/api/plants/companion-info/${encodeURIComponent(plantName)}`),
  getCareReminders: (plantId) => api.get(`/api/plants/${plantId}/care-reminders`),
  bulkCompatibilityCheck: (plantIds) => api.post('/api/plants/bulk-compatibility-check', { plant_ids: plantIds }),
  analyzeGardenLayout: () => api.get('/api/garden/analyze-layout'),
};

// Garden API
export const gardenAPI = {
  getGardenLayout: () => api.get('/api/garden'),
  createGardenPlot: (data) => api.post('/api/garden', data),
  getGardenPlot: (id) => api.get(`/api/garden/${id}`),
  updateGardenPlot: (id, data) => api.put(`/api/garden/${id}`, data),
  deleteGardenPlot: (id) => api.delete(`/api/garden/${id}`),
  bulkUpdateGarden: (data) => api.post('/api/garden/bulk', data),
  
  // Garden Location Management
  getGardenLocation: () => api.get('/api/garden/location'),
  setGardenLocation: (data) => api.post('/api/garden/location', data),
  getEnvironmentalData: (lat, lng) => api.get(`/api/garden/environmental-data/${lat}/${lng}`),
  
  // Plot Management
  getPlots: () => api.get('/api/garden/plots'),
  createPlot: (data) => api.post('/api/garden/plots', data),
  updatePlot: (id, data) => api.put(`/api/garden/plots/${id}`, data),
  deletePlot: (id) => api.delete(`/api/garden/plots/${id}`),
  
  // Plant Placement
  getPlacements: () => api.get('/api/garden/placements'),
  createPlacement: (data) => api.post('/api/garden/placements', data),
  updatePlacement: (id, data) => api.put(`/api/garden/placements/${id}`, data),
  deletePlacement: (id) => api.delete(`/api/garden/placements/${id}`),
  
  // Plant Journal
  getPlantJournal: (plantId) => api.get(`/api/garden/journal/${plantId}`),
  createJournalEntry: (data) => api.post('/api/garden/journal', data),
  updateJournalEntry: (id, data) => api.put(`/api/garden/journal/${id}`, data),
  deleteJournalEntry: (id) => api.delete(`/api/garden/journal/${id}`),
};

// Calendar API
export const calendarAPI = {
  getEvents: (params) => api.get('/api/calendar', { params }),
  createEvent: (data) => api.post('/api/calendar', data),
  getEvent: (id) => api.get(`/api/calendar/${id}`),
  updateEvent: (id, data) => api.put(`/api/calendar/${id}`, data),
  deleteEvent: (id) => api.delete(`/api/calendar/${id}`),
  completeEvent: (id) => api.post(`/api/calendar/${id}/complete`),
  getUpcomingEvents: () => api.get('/api/calendar/upcoming'),
  getOverdueEvents: () => api.get('/api/calendar/overdue'),
};

export default api; 