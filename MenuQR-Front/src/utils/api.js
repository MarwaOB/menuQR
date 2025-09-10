// api.js file 
import config from '../config';
const API_BASE_URL = config.API_BASE_URL;

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to create headers with auth token
const createHeaders = (additionalHeaders = {}, isFormData = false) => {
  const headers = {};
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add any additional headers
  Object.assign(headers, additionalHeaders);

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  
  const config = {
    headers: createHeaders(options.headers, isFormData),
    ...options,
  };

  try {
    const response = await fetch(url, config);
    let data;
    
    try {
      data = await response.json();
    } catch (jsonError) {
      // If response is not JSON, use the status text as the error message
      if (!response.ok) {
        throw new Error(response.statusText || 'Request failed');
      }
      // If response is OK but not JSON, return empty object
      return {};
    }

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      
      // Create a custom error with response data
      const error = new Error(data.error || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    
    // If it's not our custom error, wrap it to ensure consistent structure
    if (!error.response) {
      const wrappedError = new Error(error.message || 'Network error');
      wrappedError.response = { data: { error: error.message } };
      throw wrappedError;
    }
    
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (restaurantData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(restaurantData),
    }),

  forgotPassword: (email) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, newPassword) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  verifyResetToken: (token) =>
    apiRequest('/auth/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};

// Restaurant API
export const restaurantAPI = {
  getProfile: () => apiRequest('/restaurant/profile'),
  
  updateProfile: (profileData) =>
    apiRequest('/restaurant/profile/modify', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }),

  uploadLogo: (logoFile, restaurantId) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    formData.append('restaurant_id', restaurantId);
    
    return apiRequest('/restaurant/logo/upload', {
      method: 'POST',
      body: formData,
      // Headers will be automatically handled by the updated apiRequest function
    });
  },

  getLogo: (restaurantId) => apiRequest(`/restaurant/${restaurantId}/logo`),

  exportMenu: (menuId) => apiRequest(`/restaurant/export/${menuId}`),

  importMenu: (menuData) =>
    apiRequest('/restaurant/import', {
      method: 'POST',
      body: JSON.stringify(menuData),
    }),

  getInventoryAlerts: (days = 7) =>
    apiRequest(`/restaurant/inventory/alerts?days=${days}`),

  getBackup: () => apiRequest('/restaurant/backup'),

  cleanup(daysOld = 90) {
    return apiRequest('/restaurant/cleanup', {
      method: 'POST',
      body: JSON.stringify({ days: daysOld })
    });
  },
  
  getQRCode() {
    return apiRequest('/restaurant/qrcode');
  },
};

// Menu API
export const menuAPI = {
  getCurrent: () => apiRequest('/menu/current'),
  
  getAll: () => apiRequest('/menu/allMenus'),
  
  getById: (menuId) => apiRequest(`/menu/${menuId}`),
  
  getFull: (menuId) => apiRequest(`/menu/${menuId}/full`),
  
  create: (menuData) =>
    apiRequest('/menu/add', {
      method: 'POST',
      body: JSON.stringify(menuData),
    }),

  update: (menuData) =>
    apiRequest('/menu/modify', {
      method: 'POST',
      body: JSON.stringify(menuData),
    }),

  delete: (menuId) =>
    apiRequest('/menu/delete', {
      method: 'POST',
      body: JSON.stringify({ menu_id: menuId }),
    }),

  copy: (sourceMenuId, newDate, newName) =>
    apiRequest('/menu/copy', {
      method: 'POST',
      body: JSON.stringify({ source_menu_id: sourceMenuId, new_date: newDate, new_name: newName }),
    }),

  createFromExisting: (menuData) =>
    apiRequest('/menu/create-from-existing', {
      method: 'POST',
      body: JSON.stringify(menuData),
    }),

  getSuggestions: () => apiRequest('/menu/menuSuggestions'),
};

// Dish API
export const dishAPI = {
  search: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/dish/search?${queryString}`);
  },

  getByMenu: (menuId) => apiRequest(`/dish/menus/${menuId}/dishes`),
  
  getById: (dishId) => apiRequest(`/dish/${dishId}`),
  
  create: (dishData) =>
    apiRequest('/dish/add', {
      method: 'POST',
      body: JSON.stringify(dishData),
    }),

  update: (dishData) =>
    apiRequest('/dish/modify', {
      method: 'POST',
      body: JSON.stringify(dishData),
    }),

  delete: (dishId) =>
    apiRequest('/dish/delete', {
      method: 'POST',
      body: JSON.stringify({ dish_id: dishId }),
    }),

  uploadImage: (dishId, imageFile) => {
    const formData = new FormData();
    formData.append('dish_id', dishId);
    formData.append('image', imageFile);
    
    return apiRequest('/dish/image/upload', {
      method: 'POST',
      body: formData,
      // Headers will be automatically handled by the updated apiRequest function
    });
  },

  removeImage: (dishId, imageUrl) =>
    apiRequest('/dish/image/remove', {
      method: 'POST',
      body: JSON.stringify({ dish_id: dishId, image_url: imageUrl }),
    }),

  getImages: (dishId) => apiRequest(`/dish/${dishId}/images`),

  bulkAdd: (menuId, dishes) =>
    apiRequest('/dish/bulk_add', {
      method: 'POST',
      body: JSON.stringify({ menu_id: menuId, dishes }),
    }),
};

// Section API
export const sectionAPI = {
  getAll: () => apiRequest('/section/allSections'),
  
  create: (sectionData) =>
    apiRequest('/section/add', {
      method: 'POST',
      body: JSON.stringify(sectionData),
    }),

  update: (sectionData) =>
    apiRequest('/section/modify', {
      method: 'POST',
      body: JSON.stringify(sectionData),
    }),

  delete: (sectionId) =>
    apiRequest('/section/delete', {
      method: 'POST',
      body: JSON.stringify({ section_id: sectionId }),
    }),
};

// Order API
export const orderAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/order/allOrders?${queryString}`);
  },

  getById: (orderId) => apiRequest(`/order/${orderId}`),

  create: (orderData) =>
    apiRequest('/order/add', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  updateStatus: (orderId, status) =>
    apiRequest('/order/update_status', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, status }),
    }),

  cancel: (orderId) =>
    apiRequest('/order/cancel', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }),

  delete: (orderId) =>
    apiRequest('/order/delete', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }),

  getTablesStatus: () => apiRequest('/order/tables/status'),

  getKitchenOrders: () => apiRequest('/order/kitchen/live_orders'),

  getQueue: () => apiRequest('/order/orders/queue'),

  // Client management
  createInternalClient: (tableNumber) =>
    apiRequest('/order/clients/internal/add', {
      method: 'POST',
      body: JSON.stringify({ table_number: tableNumber }),
    }),
    
  // Alias for backward compatibility
  addInternalClient: (tableNumber) =>
    apiRequest('/order/clients/internal/add', {
      method: 'POST',
      body: JSON.stringify({ table_number: tableNumber }),
    }),

  addExternalClient: (clientData) =>
    apiRequest('/order/clients/external/add', {
      method: 'POST',
      body: JSON.stringify(clientData),
    }),

  getInternalClients: () => apiRequest('/order/clients/internal'),

  getExternalClients: () => apiRequest('/order/clients/external'),
};

// Statistics API
export const statisticsAPI = {
  getOrderAnalytics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/statistics/analytics/orders?${queryString}`);
  },

  getPopularDishes: (limit = 10) =>
    apiRequest(`/statistics/analytics/popular_dishes?limit=${limit}`),

  getRevenue: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/statistics/analytics/revenue?${queryString}`);
  },
};

export default {
  authAPI,
  restaurantAPI,
  menuAPI,
  dishAPI,
  sectionAPI,
  orderAPI,
  statisticsAPI,
};