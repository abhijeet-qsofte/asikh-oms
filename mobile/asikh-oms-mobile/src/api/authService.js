// src/api/authService.js
import { API_BASE_URL, DEFAULT_PIN } from '../constants/config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { login, logout, getCurrentUser, isAuthenticated } from './client';

// Simple auth service that delegates to client.js
export const authService = {
  // Login function - handles user authentication
  async login(username, password) {
    return login(username, password);
  },

  // Logout function - clears all auth data
  async logout() {
    return logout();
  },

  // Check if user is authenticated
  async isAuthenticated() {
    return isAuthenticated();
  },

  // Get current user info
  async getCurrentUser() {
    return getCurrentUser();
  },

  // Clear auth and redirect to login
  async clearAuthAndRedirect(navigation) {
    if (__DEV__) {
      console.log('Clearing auth and redirecting to login');
    }

    try {
      await this.logout();

      // Navigate to login screen
      if (navigation) {
        try {
          // Try to reset to the root navigator first (most reliable)
          if (navigation.reset) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            return { success: true };
          }

          // Try navigate method
          if (navigation.navigate) {
            navigation.navigate('Login');
            return { success: true };
          }

          console.error('No valid navigation method found');
          return { success: false, error: 'Navigation failed' };
        } catch (navError) {
          console.error('Navigation error:', navError);
          return { success: false, error: 'Navigation failed' };
        }
      } else {
        console.error('Navigation object is null or undefined');
        return { success: false, error: 'No navigation object provided' };
      }
    } catch (error) {
      console.error('Error in clearAuthAndRedirect:', error);
      return { success: false, error: error.message };
    }
  },

  // Initialize auth service - call this on app startup
  async initialize() {
    try {
      // This will be handled by client.js's initializeApiClient
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Verify PIN - used for PIN-based authentication
  async verifyPin(pin, storedPin = DEFAULT_PIN) {
    // Simple PIN verification for local testing
    if (__DEV__ && !API_BASE_URL.includes('herokuapp.com')) {
      console.log('Using local PIN verification in dev mode');
      return pin === storedPin;
    }
    
    // Get stored credentials
    try {
      const credentials = await AsyncStorage.getItem('auth_credentials');
      if (!credentials) {
        console.error('No stored credentials found for PIN verification');
        return false;
      }
      
      const { username } = JSON.parse(credentials);
      
      // Use the backend PIN login endpoint
      const response = await axios.post(`${API_BASE_URL}/api/auth/login/pin`, {
        username,
        pin,
        device_info: { platform: 'mobile', app_version: '1.0.0' }
      });
      
      if (response.data && response.data.access_token) {
        // Store the new tokens
        await AsyncStorage.setItem('user_info', JSON.stringify(response.data));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PIN verification failed:', error);
      return false;
    }
  },
  
  // Set PIN - used to initialize or update a user's PIN
  async setPin(username, password, pin) {
    try {
      console.log('Setting PIN for user:', username);
      
      // Call the backend set-pin endpoint
      const response = await axios.post(`${API_BASE_URL}/api/auth/set-pin`, {
        username,
        password,
        pin
      });
      
      if (response.data && response.data.success) {
        console.log('PIN set successfully');
        return { success: true, message: response.data.message };
      }
      
      return { success: false, error: 'Failed to set PIN' };
    } catch (error) {
      console.error('Error setting PIN:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Failed to set PIN'
      };
    }
  },
};

export default authService;
