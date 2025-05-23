// src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
} from '../constants/config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Always get a fresh token from storage for each request
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      
      if (token) {
        console.log('Setting Authorization header with token for:', config.url);
        config.headers.Authorization = `Bearer ${token}`;
        // Also set it in the default headers to ensure it persists
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('No token available for request to:', config.url);
        // Remove Authorization header if no token is available
        delete config.headers.Authorization;
        delete apiClient.defaults.headers.common['Authorization'];
      }
    } catch (error) {
      console.error('Error setting auth header:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Skip auth handling for login requests to avoid loops
    if (originalRequest?.url?.includes('/api/auth/login')) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest?._retry) {
      console.log('Received 401 error for:', originalRequest?.url);
      console.log('Attempting token refresh...');
      
      if (originalRequest) {
        originalRequest._retry = true;
      }
      
      try {
        // Import auth service dynamically to avoid circular dependency
        const { authService } = require('./authService');
        
        // Try to refresh the token
        const refreshSuccessful = await authService.checkAndRefreshToken();
        
        if (refreshSuccessful) {
          console.log('Token refresh successful, retrying original request');
          
          // Get the new token
          const newToken = await AsyncStorage.getItem(TOKEN_KEY);
          
          // Update the Authorization header for the original request
          if (originalRequest && newToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            // Retry the original request with the new token
            return apiClient(originalRequest);
          }
        } else {
          console.log('Token refresh failed, rejecting request');
          // Clear auth data
          await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
          
          // Add auth error flag to help identify auth errors in components
          error.isAuthError = true;
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        // Clear auth data
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
        
        // Add auth error flag
        error.isAuthError = true;
      }
    }
    
    // If we get here, token refresh failed or wasn't attempted
    return Promise.reject(error);
  }
);

export default apiClient;
