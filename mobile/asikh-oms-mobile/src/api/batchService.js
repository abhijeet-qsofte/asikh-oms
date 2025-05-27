// src/api/batchService.js
import axios from 'axios';
import apiClient from './client';
import { authService } from './authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY, API_BASE_URL } from '../constants/config';

/**
 * Service for batch-related API operations
 */

/**
 * Helper function to ensure authentication before making API calls
 * @returns {Object} - The main API client with authentication and token refresh capabilities
 */
const ensureAuthenticated = async () => {
  try {
    console.log('Ensuring authentication before making batch API call');
    
    // Check if authentication is required based on config
    const { REQUIRE_AUTHENTICATION } = require('../constants/config');
    
    // If authentication is not required, return the client directly
    if (!REQUIRE_AUTHENTICATION) {
      console.log('Authentication bypassed - using apiClient with mock token');
      return apiClient;
    }
    
    // Get token directly from AsyncStorage to verify we have one
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    
    if (!token) {
      console.error('No authentication token found for batch service');
      throw new Error('Not authenticated');
    }
    
    // Use the main apiClient which has token refresh capabilities
    // This is important for handling JWT signature verification errors
    console.log('Using main apiClient for batch service (with token refresh capabilities)');
    
    // The main apiClient already has the token set and refresh logic
    return apiClient;
  } catch (error) {
    console.error('Authentication check failed:', error);
    throw error;
  }
};

const batchService = {
  /**
   * Create a new batch
   * @param {Object} batchData - The batch data
   * @returns {Promise} - The API response
   */
  createBatch: async (batchData) => {
    console.log('Creating batch with data:', JSON.stringify(batchData, null, 2));
    try {
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.post('/api/batches/', batchData);
      console.log('Batch creation response:', response.data);
      return response.data;
    } catch (error) {
      // Format error message properly for display
      console.error('Batch creation error:', error.response?.data || error.message);
      
      // Handle Pydantic validation errors
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Log the full error details for debugging
        console.log('Full validation error details:', JSON.stringify(error.response.data));
        
        // Format validation errors into a readable message
        let errorMessage = 'Validation error: ';
        
        if (Array.isArray(detail)) {
          // Extract field names and error messages
          console.log('Validation error details:', detail);
          
          const fieldErrors = detail.map(err => {
            // Log the full error object
            console.log('Error object:', JSON.stringify(err));
            
            // Extract the field name from the location array
            let field = 'unknown field';
            if (err.loc && Array.isArray(err.loc)) {
              console.log('Error location:', err.loc);
              field = err.loc[err.loc.length - 1];
            }
            
            return `${field} - ${err.msg}`;
          });
          errorMessage += fieldErrors.join(', ');
        } else if (typeof detail === 'string') {
          errorMessage += detail;
        } else {
          errorMessage += JSON.stringify(detail);
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle other types of errors
      const errorMessage = typeof error.response?.data === 'object' ?
        (error.response.data.detail || JSON.stringify(error.response.data)) :
        (error.message || 'Failed to create batch');
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get a list of batches with optional filters
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getBatches: async (params = {}) => {
    console.log('batchService.getBatches called with params:', params);
    try {
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      console.log('Making API request to /api/batches');
      const response = await authClient.get('/api/batches', { params });
      console.log('API response from getBatches:', response.data);
      return response.data;
    } catch (error) {
      console.error('API error in getBatches:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get a batch by ID
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getBatchById: async (batchId) => {
    try {
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.get(`/api/batches/${batchId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get a batch by code
   * @param {string} batchCode - The batch code
   * @returns {Promise} - The API response
   */
  getBatchByCode: async (batchCode) => {
    try {
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.get(`/api/batches/code/${batchCode}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting batch by code ${batchCode}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Add a crate to a batch
   * @param {string} batchId - The batch ID
   * @param {string} qrCode - The crate QR code
   * @returns {Promise} - The API response
   */
  addCrateToBatch: async (batchId, qrCode) => {
    try {
      console.log(`Adding crate ${qrCode} to batch ${batchId}`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.post(`/api/batches/${batchId}/crates`, { qr_code: qrCode });
      console.log('Successfully added crate to batch:', response.data);
      return response.data;
    } catch (error) {
      // Format error message properly
      console.error('Error adding crate to batch:', error.response?.data || error.message);
      
      // Create a properly formatted error object with string message
      const errorMessage = typeof error.response?.data === 'object' ?
        (error.response.data.detail || JSON.stringify(error.response.data)) :
        (error.message || 'Failed to add crate to batch');
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all crates in a batch
   * @param {string} batchId - The batch ID
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getBatchCrates: async (batchId, params = {}) => {
    try {
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.get(`/api/batches/${batchId}/crates`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error getting crates for batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get batch statistics
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getBatchStats: async (batchId) => {
    try {
      console.log(`Getting stats for batch ${batchId}`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.get(`/api/batches/${batchId}/stats`);
      console.log('Batch stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error getting batch stats for ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Update a batch
   * @param {string} batchId - The batch ID
   * @param {Object} batchData - The batch data to update
   * @returns {Promise} - The API response
   */
  updateBatch: async (batchId, batchData) => {
    try {
      console.log(`Updating batch ${batchId}`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.put(`/api/batches/${batchId}`, batchData);
      console.log('Batch update response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Mark a batch as departed (in_transit)
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  markBatchDeparted: async (batchId) => {
    try {
      console.log(`Marking batch ${batchId} as departed`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.patch(`/api/batches/${batchId}/depart`);
      console.log('Batch depart response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error marking batch ${batchId} as departed:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Mark a batch as arrived (delivered)
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  markBatchArrived: async (batchId) => {
    try {
      console.log(`Marking batch ${batchId} as arrived`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      const response = await authClient.patch(`/api/batches/${batchId}/arrive`);
      console.log('Batch arrive response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error marking batch ${batchId} as arrived:`, error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Mark a batch as delivered after reconciliation is complete
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  markBatchDelivered: async (batchId) => {
    try {
      console.log(`Marking batch ${batchId} as delivered`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.post(`/api/batches/${batchId}/deliver`);
      console.log('Batch deliver response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error marking batch ${batchId} as delivered:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Close a batch after it has been delivered and reconciled
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  closeBatch: async (batchId) => {
    try {
      console.log(`Closing batch ${batchId}`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.post(`/api/batches/${batchId}/close`);
      console.log('Batch close response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error closing batch:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get reconciliation status for a batch
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response with reconciliation status
   */
  getReconciliationStatus: async (batchId) => {
    try {
      console.log(`Getting reconciliation status for batch ${batchId}`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.get(`/api/batches/${batchId}/reconciliation-stats`);
      console.log('Reconciliation status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation status:', error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Get detailed weight information for a batch
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response with detailed weight information
   */
  getBatchWeightDetails: async (batchId) => {
    try {
      console.log(`Getting detailed weight information for batch ${batchId}`);
      
      // Ensure we're authenticated before making the API call
      const authClient = await ensureAuthenticated();
      
      // Use the authenticated client for this specific request
      const response = await authClient.get(`/api/batches/${batchId}/weight-details`);
      console.log('Weight details response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting weight details:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default batchService;
