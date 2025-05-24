// src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
  TOKEN_EXPIRY_KEY,
} from '../constants/config';

// Key for storing the time offset between client and server
const TIME_OFFSET_KEY = '@asikh:time_offset';
import { jwtDecode } from 'jwt-decode';

// Log the API configuration for debugging
console.log('Creating API client with baseURL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for mobile networks
  // Don't use withCredentials for Heroku as it can cause CORS issues
  withCredentials: false,
  // Validate SSL certificates
  validateStatus: status => status >= 200 && status < 300,
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(request => {
  console.log('Starting API Request:', request.method?.toUpperCase(), request.url);
  return request;
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  response => {
    console.log('API Response Success:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('API Response Error:', error.message);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    } else if (error.request) {
      console.log('No response received. Request:', error.request._url || error.config?.url);
    }
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh requests
let isRefreshing = false;
// Queue of requests to be executed after token refresh
let refreshSubscribers = [];

/**
 * Execute all queued requests with the new token
 * @param {string} token - The new access token
 */
const onRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

/**
 * Add a request to the queue
 * @returns {Promise} A promise that resolves with the new token
 */
const addSubscriber = () => {
  return new Promise(resolve => {
    refreshSubscribers.push(resolve);
  });
};

/**
 * Check if user is authenticated with a token
 * @returns {Promise<boolean>} True if a token exists
 */
const hasAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return !!token;
  } catch (error) {
    console.error('Error checking for auth token:', error);
    return false;
  }
};

/**
 * Check if token is expired
 * @returns {Promise<boolean>} True if token is expired or will expire in the next 10 minutes
 */
const isTokenExpired = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return true;
    
    // Get the server time offset if available
    let serverTimeOffset = 0;
    try {
      const storedOffset = await AsyncStorage.getItem(TIME_OFFSET_KEY);
      if (storedOffset) {
        serverTimeOffset = parseInt(storedOffset);
        console.log(`Using stored server time offset for token expiry check: ${serverTimeOffset}ms`);
      }
    } catch (offsetError) {
      console.warn('Error getting server time offset:', offsetError);
    }
    
    // Calculate adjusted current time with server offset
    const adjustedNow = Date.now() + serverTimeOffset;
    
    // Get stored expiry time if available
    const storedExpiry = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    if (storedExpiry) {
      // Add 10 minute buffer for refresh (600000 ms) to handle potential clock skew
      const isExpired = adjustedNow > (parseInt(storedExpiry) - 600000);
      console.log(`Token expiry check: ${isExpired ? 'EXPIRED' : 'VALID'} (adjusted time: ${new Date(adjustedNow).toISOString()}, expiry: ${new Date(parseInt(storedExpiry)).toISOString()})`);
      return isExpired;
    }
    
    // Fallback: Try to decode the token
    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return false;
      
      // Add 10 minute buffer for refresh (600 seconds) to handle potential clock skew
      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const isExpired = adjustedNow > (expiryTime - 600000);
      console.log(`Token expiry check (from JWT): ${isExpired ? 'EXPIRED' : 'VALID'} (adjusted time: ${new Date(adjustedNow).toISOString()}, expiry: ${new Date(expiryTime).toISOString()})`);
      return isExpired;
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      return true; // Assume expired if can't decode
    }
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Refresh the access token using the refresh token
 * @returns {Promise<string>} A promise that resolves with the new access token
 */
const refreshAccessToken = async () => {
  if (isRefreshing) {
    return addSubscriber();
  }
  
  isRefreshing = true;
  
  try {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Create a new instance to avoid interceptors
    const refreshClient = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('Attempting to refresh token with API:', API_BASE_URL);
    const response = await refreshClient.post('/api/auth/refresh', { refresh_token: refreshToken });
    
    const { access_token, refresh_token, expires_in = 3600 } = response.data;
    
    // Calculate and store expiry time
    const expiryTime = Date.now() + (expires_in * 1000);
    await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    // Store the new tokens
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    if (refresh_token) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    }
    
    // Update the Authorization header
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Execute queued requests
    onRefreshed(access_token);
    
    console.log('Token refresh successful');
    isRefreshing = false;
    return access_token;
  } catch (error) {
    console.log('Token refresh failed:', error.message || 'Unknown error');
    isRefreshing = false;
    
    // Only clear auth data on specific errors, not when there's no refresh token
    if (error.message !== 'No refresh token available') {
      // Clear auth data on refresh failure
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY, TOKEN_EXPIRY_KEY]);
      delete apiClient.defaults.headers.common['Authorization'];
    }
    
    // Reject all queued requests
    refreshSubscribers.forEach(callback => callback(null));
    refreshSubscribers = [];
    
    throw error;
  }
};

// Request interceptor for adding auth token and handling token refresh
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Skip token check for auth endpoints to avoid infinite loops
      const isAuthEndpoint = (
        config.url === '/api/auth/login' || 
        config.url === '/api/auth/refresh'
      );
      
      if (isAuthEndpoint) {
        // For auth endpoints, don't add any token
        return config;
      }
      
      // For all other endpoints, ensure we have a valid token
      const isAuthenticated = await hasAuthToken();
      
      if (isAuthenticated) {
        // Get the current token
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        
        // Check if we should proactively refresh the token
        // This helps prevent JWT signature verification errors
        const shouldRefreshToken = await shouldProactivelyRefreshToken();
        
        if (shouldRefreshToken) {
          console.log('Proactively refreshing token before request to:', config.url);
          try {
            // Use refreshAccessToken function directly instead of importing authService
            // This avoids circular dependencies
            const newToken = await refreshAccessToken();
            
            if (newToken) {
              console.log('Proactive token refresh successful');
              // Use the new token for this request
              config.headers.Authorization = `Bearer ${newToken}`;
              return config;
            }
          } catch (refreshError) {
            console.warn('Proactive token refresh failed:', refreshError.message);
            // Continue with the existing token
          }
        }
        
        // Always set the token if we have one
        // This ensures consistent token usage across all requests
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        console.log('Not authenticated, skipping token for:', config.url);
      }
    } catch (error) {
      console.error('Error in request interceptor:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Check if we should proactively refresh the token
 * This helps prevent JWT signature verification errors by refreshing tokens
 * more frequently when we've recently encountered errors
 * @returns {Promise<boolean>} True if we should refresh the token
 */
const shouldProactivelyRefreshToken = async () => {
  try {
    // Get the last token refresh time
    const lastRefreshTimeStr = await AsyncStorage.getItem('@asikh:last_token_refresh');
    const lastRefreshTime = lastRefreshTimeStr ? parseInt(lastRefreshTimeStr) : 0;
    
    // Get the token expiry time
    const expiryTimeStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    const expiryTime = expiryTimeStr ? parseInt(expiryTimeStr) : 0;
    
    // Always use UTC time to match server-side token validation
    const nowUtc = new Date().getTime();
    
    // If token will expire in the next 30 minutes, refresh it
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const isNearingExpiry = expiryTime && (expiryTime - nowUtc < thirtyMinutesInMs);
    
    // If we haven't refreshed in the last 5 minutes, consider refreshing
    const fiveMinutesInMs = 5 * 60 * 1000;
    const hasntRefreshedRecently = !lastRefreshTime || (nowUtc - lastRefreshTime > fiveMinutesInMs);
    
    // Refresh if token is nearing expiry or we haven't refreshed recently
    const shouldRefresh = isNearingExpiry || hasntRefreshedRecently;
    
    if (shouldRefresh) {
      // Update the last refresh time with UTC timestamp
      await AsyncStorage.setItem('@asikh:last_token_refresh', nowUtc.toString());
      console.log(`Token refresh scheduled at ${new Date(nowUtc).toISOString()} (UTC)`);
    }
    
    return shouldRefresh;
  } catch (error) {
    console.warn('Error checking if should refresh token:', error);
    return false;
  }
};

/**
 * Get the server time offset from AsyncStorage
 * Note: With the transition to UTC-based timestamps, this offset is less critical
 * but still maintained for backward compatibility and edge cases
 * @returns {Promise<number>} The server time offset in milliseconds
 */
const getServerTimeOffset = async () => {
  try {
    const offsetStr = await AsyncStorage.getItem(TIME_OFFSET_KEY);
    return offsetStr ? parseInt(offsetStr) : 0;
  } catch (error) {
    console.warn('Error getting server time offset:', error);
    return 0;
  }
};

// Response interceptor for handling auth errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Get the original request config
    const originalRequest = error.config;
    
    // If we get a 401 Unauthorized error and it's not a refresh token request
    if (error.response?.status === 401 && 
        originalRequest && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/api/auth/refresh')) {
      
      console.log('Received 401 error for:', originalRequest.url);
      console.log('Error details:', error.response?.data);
      
      // Check if this is a login attempt (don't retry for login failures)
      const isLoginAttempt = originalRequest.url?.includes('/api/auth/login');
      
      if (!isLoginAttempt) {
        // Mark this request as retried to prevent infinite loops
        originalRequest._retry = true;
        
        try {
          console.log('Attempting to refresh token after 401 error');
          // Use refreshAccessToken directly to avoid circular dependencies
          const newToken = await refreshAccessToken();
          
          if (newToken) {
            console.log('Token refresh successful after 401 error');
            // Update the failed request with the new token
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            // Retry the original request with the new token
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed in response interceptor:', refreshError);
          
          // Don't immediately clear auth data on refresh failure
          // Some endpoints might still work with the current token
          console.log('Continuing with existing token despite refresh failure');
          error.isAuthError = true;
          
          // Only clear auth data if this is a critical endpoint
          const isCriticalEndpoint = originalRequest.url?.includes('/api/batches/');
          
          if (isCriticalEndpoint) {
            console.warn('Critical endpoint failed, clearing auth data');
            await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY, TOKEN_EXPIRY_KEY]);
            delete apiClient.defaults.headers.common['Authorization'];
            
            // Dispatch logout action to update Redux state
            try {
              // Import the store directly to avoid undefined references
              const store = require('../store').default;
              if (store && typeof store.dispatch === 'function') {
                store.dispatch({ type: 'auth/logout/fulfilled' });
                console.log('Dispatched logout action after authentication failure');
              } else {
                console.warn('Store not available for dispatch');
              }
            } catch (storeError) {
              console.error('Error dispatching logout action:', storeError);
            }
          }
        }
      } else {
        // For login failures, just mark as auth error
        error.isAuthError = true;
      }
    } else if (error.response?.status === 401) {
      // For refresh token failures or other 401 errors
      error.isAuthError = true;
    }
    
    // Reject the promise with the error
    return Promise.reject(error);
  }
);

export default apiClient;
