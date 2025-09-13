// Local development configuration
const config = {
  // Local development URLs
  API_BASE_URL: 'http://10.157.233.225:3000/api',
  FRONTEND_BASE_URL: 'http://192.168.1.105:5173',
  
  // Sync settings
  SYNC_INTERVAL: 100 * 60 * 1000, // 5 minutes
  MAX_SYNC_RETRIES: 3,
  
  // Offline mode settings
  OFFLINE_STORAGE_KEY: 'offlineOrders',
  LAST_SYNC_KEY: 'lastSyncTime',
  
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
  },
  
  // Check if app is running locally
  isLocalEnvironment: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '192.168.1.105';
  },
  
  // Get current environment
  getEnvironment: () => {
    return config.isLocalEnvironment() ? 'local' : 'production';
  }
};

export default config;
