// Configuration with environment variable support
const config = {
  // Use environment variable if available, otherwise use production backend
  API_BASE_URL: import.meta.env.VITE_API_URL || 'https://menuqr-i2a0.onrender.com/api',
  FRONTEND_BASE_URL: import.meta.env.VITE_FRONTEND_URL || 'https://elegant-paprenjak-543345.netlify.app',
};

// Validate API base URL
if (!config.API_BASE_URL) {
  console.error('API_BASE_URL is not set. Please set the VITE_API_URL environment variable.');
}

// Export the config with utility functions
export default {
  ...config,

  // Helper to get full API URL
  getApiUrl: (path = '') => {
    const base = config.API_BASE_URL.endsWith('/') 
      ? config.API_BASE_URL.slice(0, -1) 
      : config.API_BASE_URL;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  },

  // Helper to get full frontend URL
  getFrontendUrl: (path = '') => {
    let base = config.FRONTEND_BASE_URL;
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
};
