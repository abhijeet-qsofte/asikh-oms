// src/api/authService.js
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
  TOKEN_EXPIRY_KEY,
  API_BASE_URL,
} from '../constants/config';

// Key for storing the time offset between client and server
const TIME_OFFSET_KEY = '@asikh:time_offset';

/**
 * Extract and store token expiry time
 * @param {string} token - JWT token to extract expiry from
 * @param {number} defaultExpiresIn - Default expiry time in seconds if not in token
 * @returns {Promise<void>}
 */
const storeTokenExpiry = async (token, defaultExpiresIn = 3600) => {
  try {
    let expiryTime;
    
    // Get the server time offset if available
    let serverTimeOffset = 0;
    try {
      const storedOffset = await AsyncStorage.getItem(TIME_OFFSET_KEY);
      if (storedOffset) {
        serverTimeOffset = parseInt(storedOffset);
        console.log(`Using stored server time offset: ${serverTimeOffset}ms`);
      }
    } catch (offsetError) {
      console.warn('Error getting server time offset:', offsetError);
    }
    
    // Try to decode the token to get expiry
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp) {
        // Convert to milliseconds - JWT exp is in UTC seconds since epoch
        expiryTime = decoded.exp * 1000;
        console.log(`Raw token expiry (UTC): ${new Date(expiryTime).toISOString()}`);
      } else {
        // Fallback to default expiry with time offset
        // Use UTC time to match server-side token creation
        const nowUtcMs = new Date().getTime();
        expiryTime = nowUtcMs + (defaultExpiresIn * 1000);
      }
    } catch (decodeError) {
      console.error('Error decoding token for expiry:', decodeError);
      // Fallback to default expiry with time offset
      // Use UTC time to match server-side token creation
      const nowUtcMs = new Date().getTime();
      expiryTime = nowUtcMs + (defaultExpiresIn * 1000);
    }
    
    // Store the expiry time
    await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    console.log(`Token expiry set to ${new Date(expiryTime).toISOString()} (UTC)`);
  } catch (error) {
    console.error('Error storing token expiry:', error);
  }
};

export const authService = {
  async login(username, password, deviceInfo = null) {
    console.log('authService.login: Attempting login for', username);
    
    try {
      
      // FastAPI OAuth2 expects URL-encoded form data
      console.log('Using URL-encoded form data format for OAuth2');
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('username', username);
      urlEncodedData.append('password', password);
      
      // Set the content type to application/x-www-form-urlencoded
      const response = await apiClient.post('/api/auth/login', urlEncodedData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      // Log detailed response for debugging
      console.log('Login response status:', response.status);
      console.log('Login response headers:', JSON.stringify(response.headers));
      console.log('Login response data structure:', Object.keys(response.data).join(', '));

      // Try to extract server time from response headers
      try {
        // Access headers directly from the Axios response
        console.log('Response headers raw:', response.headers);
        
        // Headers might be case-sensitive or in different formats depending on the environment
        const dateHeader = response.headers.date || 
                          response.headers.Date || 
                          response.headers['date'] || 
                          response.headers['Date'];
                          
        console.log('Extracted date header:', dateHeader);
        
        if (dateHeader) {
          // Server time from Date header is already in UTC
          const serverTimeUtc = new Date(dateHeader).getTime();
          // Ensure client time is also in UTC
          const clientTimeUtc = new Date().getTime();
          
          // With both times in UTC, the offset should be minimal and only reflect actual clock differences
          const serverTimeOffset = serverTimeUtc - clientTimeUtc;
          
          console.log(`Time offset between server and client (both UTC): ${serverTimeOffset}ms`);
          console.log(`Server time (UTC): ${new Date(serverTimeUtc).toISOString()}, Client time (UTC): ${new Date(clientTimeUtc).toISOString()}`);
          
          // Store the time offset for backward compatibility
          // Note: With consistent UTC usage, this offset should be much smaller
          await AsyncStorage.setItem(TIME_OFFSET_KEY, serverTimeOffset.toString());
        } else {
          // If no date header, try to extract from expires_at in the response data
          if (response.data && response.data.expires_at) {
            console.log('Using expires_at from response data for time synchronization');
            // Token expiry time should be in UTC
            const tokenExpiryTimeUtc = new Date(response.data.expires_at).getTime();
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour
            const serverTimeUtc = tokenExpiryTimeUtc - (expiresIn * 1000);
            const clientTimeUtc = new Date().getTime();
            
            // Calculate offset between server and client UTC times
            const serverTimeOffset = serverTimeUtc - clientTimeUtc;
            
            console.log(`Time offset from token expiry (UTC): ${serverTimeOffset}ms`);
            console.log(`Calculated server time (UTC): ${new Date(serverTimeUtc).toISOString()}, Client time (UTC): ${new Date(clientTimeUtc).toISOString()}`);
            
            await AsyncStorage.setItem(TIME_OFFSET_KEY, serverTimeOffset.toString());
          } else {
            console.warn('No date header or expires_at found in response, cannot synchronize time');
            // Even without server time, we'll use UTC consistently
            console.log('Will use client UTC time for token operations');
          }
        }
      } catch (timeError) {
        console.warn('Could not extract server time from response:', timeError.message);
      }

      console.log('authService.login: Login successful, processing response');
      
      const {
        access_token,
        refresh_token,
        user_id,
        username: user,
        role,
        expires_in = 3600, // Default to 1 hour if not provided
      } = response.data;

      // Store auth tokens and user info
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      await AsyncStorage.setItem(
        USER_INFO_KEY,
        JSON.stringify({
          id: user_id,
          username: user,
          role,
        })
      );
      
      // Store token expiry time
      await storeTokenExpiry(access_token, expires_in);

      // Set the token in API client headers
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      console.log('authService.login: Set token in API client headers after login');
      
      // Verify the header was set
      if (apiClient.defaults.headers.common['Authorization']) {
        console.log('authService.login: Authorization header successfully set');
      } else {
        console.error('authService.login: Failed to set Authorization header');
      }

      return response.data;
    } catch (error) {
      console.error('authService.login: Login failed', error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Refresh the access token using the refresh token
   * @returns {Promise<Object>} The refresh response data
   */
  async refreshToken() {
    console.log('authService.refreshToken: Attempting to refresh token');
    
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Import axios directly to avoid circular dependencies
      // This is necessary because client.js imports authService.js
      const axiosModule = require('axios');
      
      // Create a fresh axios instance for token refresh to avoid interceptors
      // This prevents potential infinite loops with the main apiClient
      const refreshClient = axiosModule.default.create({
        baseURL: API_BASE_URL,
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10 second timeout for refresh requests
      });
      
      console.log('Using dedicated client for token refresh');
      const response = await refreshClient.post('/api/auth/refresh', {
        refresh_token: refreshToken
      });
      
      const {
        access_token,
        refresh_token,
        expires_in = 3600, // Default to 1 hour if not provided
      } = response.data;
      
      // Store the new tokens
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      if (refresh_token) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      
      // Store token expiry time
      await storeTokenExpiry(access_token, expires_in);
      
      // Update the Authorization header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Try to extract server time from response headers for better synchronization
      try {
        const dateHeader = response.headers.date || 
                          response.headers.Date || 
                          response.headers['date'] || 
                          response.headers['Date'];
                          
        if (dateHeader) {
          // Server time from Date header is already in UTC
          const serverTimeUtc = new Date(dateHeader).getTime();
          // Ensure client time is also in UTC
          const clientTimeUtc = new Date().getTime();
          
          // With both times in UTC, the offset should be minimal
          const serverTimeOffset = serverTimeUtc - clientTimeUtc;
          
          console.log(`Updated time offset from refresh (UTC): ${serverTimeOffset}ms`);
          console.log(`Server time (UTC): ${new Date(serverTimeUtc).toISOString()}, Client time (UTC): ${new Date(clientTimeUtc).toISOString()}`);
          
          await AsyncStorage.setItem(TIME_OFFSET_KEY, serverTimeOffset.toString());
        }
      } catch (timeError) {
        console.warn('Could not update time offset from refresh response:', timeError.message);
      }
      
      console.log('authService.refreshToken: Token refreshed successfully');
      return response.data;
    } catch (error) {
      console.error('authService.refreshToken: Token refresh failed', error.response?.data || error.message);
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
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
      TOKEN_EXPIRY_KEY,
    ]);
    
    // Clear Authorization header
    delete apiClient.defaults.headers.common['Authorization'];
    console.log('Cleared Authorization header after logout');
    
    return true;
  },

  async getCurrentUser() {
    const userInfo = await AsyncStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  },

  /**
   * Check if the user is authenticated with a valid, non-expired token
   * @returns {Promise<boolean>} True if authenticated with valid token
   */
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return false;
      
      // Check if token is expired
      const storedExpiry = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
      if (storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        if (Date.now() >= expiryTime) {
          console.log('Token is expired, attempting refresh');
          try {
            // Try to refresh the token
            await this.refreshToken();
            return true;
          } catch (refreshError) {
            console.error('Token refresh failed during authentication check:', refreshError);
            return false;
          }
        }
      } else {
        // If no expiry stored, try to decode token
        try {
          const decoded = jwtDecode(token);
          if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            console.log('Token is expired based on JWT payload, attempting refresh');
            try {
              // Try to refresh the token
              await this.refreshToken();
              return true;
            } catch (refreshError) {
              console.error('Token refresh failed during authentication check:', refreshError);
              return false;
            }
          }
        } catch (decodeError) {
          console.error('Error decoding token during authentication check:', decodeError);
          // Continue with token existence check
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  },
  
  // Helper to clear auth and redirect to login
  async clearAuthAndRedirect(navigation) {
    console.log('Clearing auth and redirecting to login');
    
    // First logout to clear tokens
    await this.logout();
    
    // Instead of using navigation.reset, we'll dispatch an action to the Redux store
    // to update the authentication state, which will trigger the conditional rendering
    // in the AppNavigator
    const { store } = require('../store');
    
    // Dispatch an action to update the auth state
    store.dispatch({
      type: 'auth/logout/fulfilled'
    });
    
    console.log('Auth state updated, app should redirect to login screen');
  },
};
