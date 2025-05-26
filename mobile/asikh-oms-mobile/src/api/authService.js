// src/api/authService.js
import { API_BASE_URL } from '../constants/config';
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
};

export default authService;
