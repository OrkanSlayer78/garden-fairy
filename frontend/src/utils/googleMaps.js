// Google Maps API utility functions
let isGoogleMapsLoaded = false;
let googleMapsPromise = null;

// Your Google Maps API Key - replace with your actual key
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

// Load Google Maps API script
export const loadGoogleMaps = () => {
  if (isGoogleMapsLoaded) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
      console.warn('Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY environment variable.');
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,drawing,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isGoogleMapsLoaded = true;
      resolve(window.google);
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// Generate static map URL for satellite imagery
export const getStaticSatelliteMapUrl = (lat, lng, width = 600, height = 400, zoom = 18) => {
  if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
};

// Generate static map URL for regular maps
export const getStaticMapUrl = (lat, lng, width = 600, height = 400, zoom = 15) => {
  if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
};

// Check if Google Maps API is available
export const isGoogleMapsAvailable = () => {
  return GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE';
}; 