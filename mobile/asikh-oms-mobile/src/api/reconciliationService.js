// src/api/reconciliationService.js
import axios from 'axios';
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY, API_BASE_URL } from '../constants/config';

/**
 * Helper function to ensure authentication before making API calls
 * @returns {Object} - The main API client with authentication and token refresh capabilities
 */
const ensureAuthenticated = async () => {
  try {
    console.log('Ensuring authentication for reconciliation service API call');
    
    // Get token directly from AsyncStorage to verify we have one
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    
    if (!token) {
      console.error('No authentication token found for reconciliation service');
      throw new Error('Not authenticated');
    }
    
    // Use the main apiClient which has token refresh capabilities
    // This is important for handling JWT signature verification errors
    console.log('Using main apiClient for reconciliation service (with token refresh capabilities)');
    
    // The main apiClient already has the token set and refresh logic
    return apiClient;
  } catch (error) {
    console.error('Authentication check failed for reconciliation service:', error);
    throw error;
  }
};

/**
 * Service for reconciliation-related API operations
 */
const reconciliationService = {
  /**
   * Reconcile a crate with a batch
   * @param {string} batchId - The batch ID
   * @param {string} qrCode - The crate QR code
   * @returns {Promise} - The API response
   */
  reconcileCrate: async (batchId, qrCode) => {
    console.log(`Reconciling crate ${qrCode} with batch ${batchId}`);
    try {
      // Get authenticated client
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.post(`/api/batches/${batchId}/reconcile`, { qr_code: qrCode });
      console.log('Reconciliation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Reconciliation error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get reconciliation statistics for a batch
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getReconciliationStats: async (batchId) => {
    try {
      // Get authenticated client
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.get(`/api/batches/${batchId}/reconciliation-stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reconciliation stats:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default reconciliationService;
