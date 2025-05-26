// src/api/authService.js
import { API_BASE_URL, DEFAULT_PIN, REQUIRE_AUTHENTICATION } from '../constants/config';
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
    // If authentication is not required, always return true
    if (!REQUIRE_AUTHENTICATION) {
      console.log('Authentication bypassed - always authenticated');
      return true;
    }
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
    // If authentication is not required, always return true
    if (!REQUIRE_AUTHENTICATION) {
      console.log('Authentication bypassed - PIN verification always succeeds');
      return true;
    }
    
    // Simple PIN verification for local testing
    if (__DEV__ && !API_BASE_URL.includes('herokuapp.com')) {
      console.log('Using local PIN verification in dev mode');
      return pin === storedPin;
    }
    
    // Get stored credentials or user info
    try {
      // Try to get user info first
      const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
      let username;
      
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        username = userInfo.username;
      } else {
        // Fall back to credentials if no user info
        const credentialsStr = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
        if (!credentialsStr) {
          console.error('No stored credentials or user info found for PIN verification');
          return false;
        }
        const credentials = JSON.parse(credentialsStr);
        username = credentials.username;
      }
      
      if (!username) {
        console.error('No username found for PIN verification');
        return false;
      }
      
      console.log(`Attempting PIN login for user: ${username}`);
      
      // Use the backend PIN login endpoint
      const response = await axios.post(`${API_BASE_URL}/api/auth/login/pin`, {
        username,
        pin,
        device_info: { platform: 'mobile', app_version: '1.0.0' }
      });
      
      if (response.data && response.data.access_token) {
        console.log('PIN login successful');
        // Store the new tokens and user info
        await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(response.data));
        return true;
      }
      
      console.warn('PIN login response did not contain access token');
      return false;
    } catch (error) {
      console.error('PIN verification failed:', error.response?.data?.detail || error.message);
      return false;
    }
  },
  
  // Set PIN - used to initialize or update a user's PIN
  async setPin(username, password, pin) {
    // If authentication is not required, just pretend it succeeded
    if (!REQUIRE_AUTHENTICATION) {
      console.log('Authentication bypassed - PIN set operation simulated');
      return { success: true, message: "PIN set successfully (simulated)" };
    }
    
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
      
      console.warn('Set PIN response did not indicate success:', response.data);
      return { success: false, error: 'Failed to set PIN' };
    } catch (error) {
      console.error('Error setting PIN:', error);
      // Provide more detailed error information
      const errorDetail = error.response?.data?.detail || error.message || 'Failed to set PIN';
      console.error('Error details:', errorDetail);
      
      return { 
        success: false, 
        error: errorDetail
      };
    }
  },
};

export default authService;
