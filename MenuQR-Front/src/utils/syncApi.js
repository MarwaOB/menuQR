// syncApi.js - API client for syncing with deployed backend

const DEPLOYED_API_URL = 'https://menuqr-i2a0.onrender.com/api';

// Helper function to create headers with auth token
const createHeaders = (additionalHeaders = {}, isFormData = false) => {
  const headers = {};
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add any additional headers
  Object.assign(headers, additionalHeaders);

  // Get auth token from localStorage
  const token = localStorage.getItem('authToken');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Generic sync API request function
const syncApiRequest = async (endpoint, options = {}) => {
  const url = `${DEPLOYED_API_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  
  const config = {
    headers: createHeaders(options.headers, isFormData),
    ...options,
  };

  try {
    console.log(`Making request to: ${url}`, { method: config.method, body: config.body });
    const response = await fetch(url, config);
    let data;
    let errorMessage = `Sync request failed: ${response.status} ${response.statusText}`;
    
    try {
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      try {
        data = JSON.parse(responseText);
        // If the response has an error message, use it
        if (data.error) {
          errorMessage = `${response.status} ${response.statusText}: ${data.error}`;
        } else if (data.message) {
          errorMessage = `${response.status} ${response.statusText}: ${data.message}`;
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        errorMessage = `Invalid JSON response: ${responseText.substring(0, 200)}`;
      }
    } catch (error) {
      console.error('Error reading response:', error);
      errorMessage = `Failed to read response: ${error.message}`;
    }
    
    // If the response is not OK, throw an error with the message
    if (!response.ok) {
      console.error('Request failed:', { 
        status: response.status, 
        statusText: response.statusText,
        url,
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }

    if (!response.ok) {
      const error = new Error(data.message || 'Sync request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Sync API Error:', error);
    throw error;
  }
};

// Order Sync API
export const syncOrderAPI = {
  create: async (orderData) => {
    console.log('Sending order to sync API:', orderData);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return syncApiRequest('/order/add', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });
  },
  
  // Add other order-related sync methods as needed
};

export default {
  syncOrderAPI
};
