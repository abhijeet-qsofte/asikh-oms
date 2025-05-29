/**
 * Batch service for handling all batch-related API operations
 */
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../constants/api';

/**
 * Service for batch-related API operations
 */
const batchService = {
  /**
   * Create a new batch
   * @param {Object} batchData - The batch data
   * @returns {Promise} - The API response
   */
  createBatch: async (batchData) => {
    try {
      console.log('Creating batch with data:', JSON.stringify(batchData, null, 2));
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCHES}`, batchData);
      console.log('Batch creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Batch creation error:', error.response?.data || error.message);
      
      // Handle Pydantic validation errors
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Format validation errors into a readable message
        let errorMessage = 'Validation error: ';
        
        if (Array.isArray(detail)) {
          const fieldErrors = detail.map(err => {
            let field = 'unknown field';
            if (err.loc && Array.isArray(err.loc)) {
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
    try {
      console.log('batchService.getBatches called with params:', params);
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCHES}`, { params });
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
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_DETAIL(batchId)}`);
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
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_BY_CODE(batchCode)}`);
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
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_ADD_CRATE(batchId)}`, { qr_code: qrCode });
      console.log('Successfully added crate to batch:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding crate to batch:', error.response?.data || error.message);
      
      // Create a properly formatted error object with string message
      const errorMessage = typeof error.response?.data === 'object' ?
        (error.response.data.detail || JSON.stringify(error.response.data)) :
        (error.message || 'Failed to add crate to batch');
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get crates in a batch
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getBatchCrates: async (batchId) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_CRATES(batchId)}`);
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
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_STATS(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting stats for batch ${batchId}:`, error.response?.data || error.message);
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
      const response = await axios.put(`${API_URL}${ENDPOINTS.BATCH_DETAIL(batchId)}`, batchData);
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
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_DEPART(batchId)}`);
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
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_ARRIVE(batchId)}`);
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
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_DELIVER(batchId)}`);
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
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_CLOSE(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error closing batch ${batchId}:`, error.response?.data || error.message);
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
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_RECONCILIATION_STATUS(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting reconciliation status for batch ${batchId}:`, error.response?.data || error.message);
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
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_WEIGHT_DETAILS(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting weight details for batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  }
};

export default batchService;
