// Base configuration
const baseConfig = {
  // Development environment (default)
  development: {
    API_BASE_URL: 'http://192.168.1.105:3000/api',
    FRONTEND_BASE_URL: 'http://192.168.1.105:5173',
  },
  // Production environment
  production: {
    API_BASE_URL: 'YOUR_PRODUCTION_BACKEND_URL/api',
    FRONTEND_BASE_URL: 'YOUR_PRODUCTION_FRONTEND_URL',
  },
};

// Determine the current environment
const env = process.env.NODE_ENV || 'development';

// Export the config with some utility functions
export default {
  ...baseConfig[env],
  
  // Helper to get full API URL
  getApiUrl: (path = '') => {
    return `${baseConfig[env].API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  },
  
  // Helper to get full frontend URL
  getFrontendUrl: (path = '') => {
    const base = baseConfig[env].FRONTEND_BASE_URL;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
};
