// Production configuration only
const config = {
  API_BASE_URL: 'https://menuqr-i2a0.onrender.com/api',
  FRONTEND_BASE_URL: 'YOUR_PRODUCTION_FRONTEND_URL',
};

// Export the config with utility functions
export default {
  ...config,

  // Helper to get full API URL
  getApiUrl: (path = '') => {
    return `${config.API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  },

  // Helper to get full frontend URL
  getFrontendUrl: (path = '') => {
    const base = config.FRONTEND_BASE_URL;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
};
