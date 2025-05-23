// src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // Handle token refresh if 401 error
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        
        // If no refresh token, we can't refresh
        if (!refreshToken) {
          console.log('No refresh token available, cannot refresh');
          // Clear auth data since we can't refresh
          await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
          // Redirect to login (this will be handled by the app navigation)
          return Promise.reject(error);
        }
        
        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // If successful, update tokens
        if (response.data && response.data.access_token) {
          const { access_token, refresh_token } = response.data;

          await AsyncStorage.setItem(TOKEN_KEY, access_token);
          if (refresh_token) {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
          }

          // Update authorization header and retry the request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } else {
          console.log('Token refresh response did not contain access_token');
          return Promise.reject(error);
        }
      } catch (error) {
        // Force logout if refresh fails
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
        // Return to login screen logic would be here
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
