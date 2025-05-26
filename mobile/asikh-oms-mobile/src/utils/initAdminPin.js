// src/utils/initAdminPin.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PIN_AUTH_KEY, DEFAULT_PIN, AUTH_CREDENTIALS_KEY } from '../constants/config';
import authService from '../api/authService';

/**
 * Initialize admin user with default PIN
 * This is a utility function to set up PIN authentication without requiring
 * an initial login with username and password
 * 
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<boolean>} - Success status
 */
export const initAdminWithDefaultPin = async (username, password) => {
  try {
    console.log('Initializing admin user with default PIN');
    
    // Store credentials for regular auth
    await AsyncStorage.setItem(AUTH_CREDENTIALS_KEY, JSON.stringify({
      username,
      password
    }));
    
    // Store PIN data locally
    await AsyncStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
      username,
      pin: DEFAULT_PIN,
      password
    }));
    
    // Set PIN on the backend
    const result = await authService.setPin(username, password, DEFAULT_PIN);
    
    if (result.success) {
      console.log('Admin user initialized with default PIN on backend');
      return true;
    } else {
      console.error('Backend PIN setup failed:', result.error);
      // Even if backend fails, we've stored the PIN locally for development mode
      return true;
    }
  } catch (error) {
    console.error('Error initializing admin with default PIN:', error);
    return false;
  }
};

/**
 * Check if PIN data exists
 * @returns {Promise<boolean>} - True if PIN data exists
 */
export const checkPinDataExists = async () => {
  try {
    const pinData = await AsyncStorage.getItem(PIN_AUTH_KEY);
    return !!pinData;
  } catch (error) {
    console.error('Error checking PIN data:', error);
    return false;
  }
};
