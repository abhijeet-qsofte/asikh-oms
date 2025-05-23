// src/api/authService.js
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
} from '../constants/config';
import axios from 'axios';

export const authService = {
  async checkAndRefreshToken() {
    try {
      console.log('Starting token refresh check');
      
      // Get tokens from storage
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      
      // Log token status
      console.log('Token check:', { 
        hasAccessToken: !!token, 
        hasRefreshToken: !!refreshToken 
      });
      
      if (!token || !refreshToken) {
        console.log('No token or refresh token available');
        // Clear any potentially corrupted tokens
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
        delete apiClient.defaults.headers.common['Authorization'];
        return false;
      }
      
      // Set the token in headers immediately if we have one
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Always try to refresh the token to ensure it's fresh
      console.log('Attempting to refresh token...');
      
      try {
        // Use fetch directly instead of apiClient to avoid circular dependency
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });
        
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
          console.log(`Token refresh failed with status: ${response.status}`);
          // Clear tokens on 401 Unauthorized
          if (response.status === 401) {
            console.log('Clearing auth tokens due to 401 response');
            await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
            delete apiClient.defaults.headers.common['Authorization'];
          }
          return false;
        }
        
        const data = await response.json();
        console.log('Token refresh response received:', { 
          hasAccessToken: !!data.access_token, 
          hasRefreshToken: !!data.refresh_token 
        });
        
        if (data && data.access_token) {
          console.log('Token refresh successful, updating tokens');
          
          // Store the new tokens with Promise.all for better reliability
          const storePromises = [AsyncStorage.setItem(TOKEN_KEY, data.access_token)];
          
          if (data.refresh_token) {
            storePromises.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token));
          }
          
          await Promise.all(storePromises);
          
          // Verify tokens were stored correctly
          const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
          console.log('Token storage verification after refresh:', { 
            tokenStored: storedToken === data.access_token 
          });
          
          // Update the Authorization header in apiClient
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
          console.log('Updated Authorization header after token refresh');
          
          return true;
        } else {
          console.log('Token refresh response did not contain access_token');
          return false;
        }
      } catch (fetchError) {
        console.error('Error during token refresh fetch:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('Token refresh process failed:', error);
      // Clear tokens on any critical error
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
      delete apiClient.defaults.headers.common['Authorization'];
      return false;
    }
  },

  async login(username, password, deviceInfo = null) {
    try {
      console.log('Attempting login for user:', username);
      
      // Clear existing tokens before login attempt
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
      
      // Also clear the Authorization header
      delete apiClient.defaults.headers.common['Authorization'];
      
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      console.log('Preparing login request with username:', username);
      
      // Create form data for login request
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      if (deviceInfo) {
        formData.append('device_info', JSON.stringify(deviceInfo));
      }
      
      console.log('Sending login request to:', `${API_BASE_URL}/api/auth/login`);
      
      // Make login request with form data
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.error('Login failed with status:', response.status);
        throw new Error(`Login failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Login response received:', { hasAccessToken: !!data.access_token, hasRefreshToken: !!data.refresh_token });
      
      const { access_token, refresh_token, user } = data;
      
      if (access_token && refresh_token) {
        console.log('Login successful, storing tokens');
        
        // Store tokens with Promise.all for better reliability
        const storePromises = [
          AsyncStorage.setItem(TOKEN_KEY, access_token),
          AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
        ];
        
        if (user) {
          storePromises.push(AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user)));
        }
        
        await Promise.all(storePromises);
        
        // Verify tokens were stored correctly
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        
        console.log('Token storage verification:', { 
          tokenStored: storedToken === access_token,
          refreshTokenStored: storedRefreshToken === refresh_token
        });
        
        // Set the Authorization header for all future requests
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        console.log('Authorization header set for API client');
        
        return {
          user,
          token: access_token,
        };
      } else {
        console.error('Invalid login response:', data);
        throw new Error('Invalid response from server - missing tokens');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Clear any tokens that might have been set
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
      delete apiClient.defaults.headers.common['Authorization'];
      throw error;
    }
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Continue with local logout even if API call fails
      console.error('Logout API call failed:', error);
    }

    // Clear local storage
    return AsyncStorage.multiRemove([
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
    ]);
  },

  async getCurrentUser() {
    const userInfo = await AsyncStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  },

  async isAuthenticated() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return !!(token && refreshToken);
  },

  // Helper to clear auth data and redirect to login
  async clearAuthAndRedirect(navigation) {
    try {
      console.log('Clearing authentication data and redirecting to login');
      
      // Clear all auth tokens
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
      
      // Clear auth header
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Navigate to login screen
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
};
