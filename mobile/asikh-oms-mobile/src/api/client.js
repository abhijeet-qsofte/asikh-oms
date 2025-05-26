// src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_CREDENTIALS_KEY, USER_INFO_KEY } from '../constants/config';

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
});

// Request interceptor for adding auth credentials and debugging
apiClient.interceptors.request.use(async (config) => {
  // Skip auth check for login endpoint to avoid loops
  const isLoginEndpoint = config.url === '/api/auth/login/mobile';
  
  if (!isLoginEndpoint && !config.headers.Authorization) {
    // Try to get user info with JWT token first
    const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.access_token) {
          config.headers.Authorization = `Bearer ${userInfo.access_token}`;
          if (__DEV__) console.log('Using JWT token for request');
        }
      } catch (e) {
        console.error('Error parsing user info:', e);
      }
    }
    
    // If no JWT token, fall back to basic auth
    if (!config.headers.Authorization) {
      const credentials = await getAuthCredentials();
      if (credentials && credentials.username && credentials.password) {
        const base64Credentials = btoa(`${credentials.username}:${credentials.password}`);
        config.headers.Authorization = `Basic ${base64Credentials}`;
        if (__DEV__) console.log('Using Basic Auth for request');
      }
    }
  }
  
  if (__DEV__) {
    console.log('Starting API Request:', config.method?.toUpperCase(), config.url);
    if (config.headers.Authorization) {
      console.log('Request includes auth credentials');
    }
  }
  
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor for handling auth errors and debugging
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('API Response Success:', response.status, response.config.url);
    }
    return response;
  },
  async (error) => {
    console.error('API Response Error:', error.message);
    
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
      
      // Handle 401 Unauthorized errors
      if (error.response.status === 401) {
        // Check if we can refresh the token
        try {
          const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            if (userInfo.refresh_token) {
              console.log('Attempting to refresh token');
              
              // Try to refresh the token
              const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
                refresh_token: userInfo.refresh_token
              });
              
              if (refreshResponse.data && refreshResponse.data.access_token) {
                // Update the tokens
                userInfo.access_token = refreshResponse.data.access_token;
                userInfo.refresh_token = refreshResponse.data.refresh_token || userInfo.refresh_token;
                userInfo.expires_at = refreshResponse.data.expires_at;
                
                // Save updated tokens
                await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
                
                // Update the auth header
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${userInfo.access_token}`;
                
                console.log('Token refreshed successfully');
                
                // Retry the original request
                const originalRequest = error.config;
                return apiClient(originalRequest);
              }
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError.message);
        }
        
        // If we get here, token refresh failed or wasn't possible
        console.log('Authentication failed - clearing credentials');
        
        // Clear credentials and notify the app
        await logout();
        
        // Add a flag to the error to indicate auth failure
        error.isAuthError = true;
      }
    } else if (error.request) {
      console.log('No response received. Request:', error.request._url || error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if credentials exist
 */
const isAuthenticated = async () => {
  try {
    const credentials = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
    return !!credentials;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Get the current auth credentials
 * @returns {Promise<{username: string, password: string}|null>} The credentials or null
 */
const getAuthCredentials = async () => {
  try {
    const credentialsString = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
    return credentialsString ? JSON.parse(credentialsString) : null;
  } catch (error) {
    console.error('Error getting auth credentials:', error);
    return null;
  }
};

/**
 * Set the auth credentials in AsyncStorage and in the API client headers
 * @param {Object} credentials - The auth credentials to set
 * @param {string} credentials.username - The username
 * @param {string} credentials.password - The password
 * @returns {Promise<void>}
 */
const setAuthCredentials = async (credentials) => {
  try {
    if (credentials && credentials.username && credentials.password) {
      // Store credentials
      await AsyncStorage.setItem(AUTH_CREDENTIALS_KEY, JSON.stringify(credentials));
      
      // Create Basic Auth header
      const base64Credentials = btoa(`${credentials.username}:${credentials.password}`);
      apiClient.defaults.headers.common['Authorization'] = `Basic ${base64Credentials}`;
      
      if (__DEV__) {
        console.log('Auth credentials set successfully for:', credentials.username);
      }
    } else {
      await AsyncStorage.removeItem(AUTH_CREDENTIALS_KEY);
      delete apiClient.defaults.headers.common['Authorization'];
      if (__DEV__) {
        console.log('Auth credentials cleared');
      }
    }
  } catch (error) {
    console.error('Error setting auth credentials:', error);
  }
};

/**
 * Login with username and password
 * @param {string} username - The username to login with
 * @param {string} password - The password to login with
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>} Login result
 */
const login = async (username, password) => {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }
    
    // Create Basic Auth header for this request
    const base64Credentials = btoa(`${username}:${password}`);
    const authHeader = `Basic ${base64Credentials}`;
    
    // Make login request to the mobile login endpoint
    const response = await axios.post(`${API_BASE_URL}/api/auth/login/mobile`, {
      username,
      password,
      device_info: {
        platform: 'mobile',
        app_version: '1.0.0'
      }
    });
    
    // If we get here, authentication was successful
    // Store the credentials for basic auth as a fallback
    const credentials = { username, password };
    await setAuthCredentials(credentials);
    
    // Extract tokens and user info from response
    const { access_token, refresh_token, user_id, username: responseUsername, role } = response.data;
    
    // Store the tokens and user info
    const userInfo = {
      id: user_id,
      username: responseUsername || username,
      role,
      access_token,
      refresh_token,
      expires_at: response.data.expires_at
    };
    
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
    
    // Set the token in the API client headers
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    return { 
      success: true, 
      user: userInfo
    };
  } catch (error) {
    console.error('Login failed:', error.message);
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Login failed'
    };
  }
};

/**
 * Logout the current user
 * @returns {Promise<{success: boolean, error?: string}>} Logout result
 */
const logout = async () => {
  try {
    // Make sure keys are defined before using multiRemove
    const keysToRemove = [];
    if (AUTH_CREDENTIALS_KEY) keysToRemove.push(AUTH_CREDENTIALS_KEY);
    if (USER_INFO_KEY) keysToRemove.push(USER_INFO_KEY);
    
    // Only call multiRemove if we have keys to remove
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    
    // Clear authorization header
    delete apiClient.defaults.headers.common['Authorization'];
    
    if (__DEV__) {
      console.log('Logged out successfully');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    return { success: false, error: error.message };
  }
};

// Initialize the API client with existing credentials on app startup
const initializeApiClient = async () => {
  try {
    const credentials = await getAuthCredentials();
    if (credentials && credentials.username && credentials.password) {
      // Set up Basic Auth header
      const base64Credentials = btoa(`${credentials.username}:${credentials.password}`);
      apiClient.defaults.headers.common['Authorization'] = `Basic ${base64Credentials}`;
      
      if (__DEV__) {
        console.log('API client initialized with existing credentials for:', credentials.username);
      }
    }
    return true;
  } catch (error) {
    console.error('Error initializing API client:', error);
    return false;
  }
};

/**
 * Get the current user info
 * @returns {Promise<Object|null>} The user info or null
 */
const getCurrentUser = async () => {
  try {
    const userInfoString = await AsyncStorage.getItem(USER_INFO_KEY);
    return userInfoString ? JSON.parse(userInfoString) : null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Export the API client and utility functions
export default apiClient;
export {
  isAuthenticated,
  getAuthCredentials,
  setAuthCredentials,
  login,
  logout,
  initializeApiClient,
  getCurrentUser
};
