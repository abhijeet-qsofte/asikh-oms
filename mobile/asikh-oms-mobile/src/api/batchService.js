// src/api/batchService.js
import apiClient from './client';

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
    console.log('Creating batch with data:', JSON.stringify(batchData, null, 2));
    try {
      const response = await apiClient.post('/api/batches/', batchData);
      console.log('Batch creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Batch creation error:', error.response?.data || error.message);
      throw error;
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
      console.log('Making API request to /api/batches/');
      const response = await apiClient.get('/api/batches/', { params });
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
    const response = await apiClient.get(`/api/batches/${batchId}`);
    return response.data;
  },

  /**
   * Get a batch by code
   * @param {string} batchCode - The batch code
   * @returns {Promise} - The API response
   */
  getBatchByCode: async (batchCode) => {
    const response = await apiClient.get(`/api/batches/code/${batchCode}`);
    return response.data;
  },

  /**
   * Add a crate to a batch
   * @param {string} batchId - The batch ID
   * @param {string} qrCode - The crate QR code
   * @returns {Promise} - The API response
   */
  addCrateToBatch: async (batchId, qrCode) => {
    const response = await apiClient.post(`/api/batches/${batchId}/crates`, { qr_code: qrCode });
    return response.data;
  },

  /**
   * Get all crates in a batch
   * @param {string} batchId - The batch ID
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getBatchCrates: async (batchId, params = {}) => {
    const response = await apiClient.get(`/api/batches/${batchId}/crates`, { params });
    return response.data;
  },

  /**
   * Get batch statistics
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getBatchStats: async (batchId) => {
    const response = await apiClient.get(`/api/batches/${batchId}/stats`);
    return response.data;
  },

  /**
   * Update a batch
   * @param {string} batchId - The batch ID
   * @param {Object} batchData - The batch data to update
   * @returns {Promise} - The API response
   */
  updateBatch: async (batchId, batchData) => {
    const response = await apiClient.put(`/api/batches/${batchId}`, batchData);
    return response.data;
  },

  /**
   * Mark a batch as departed (in_transit)
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  markBatchDeparted: async (batchId) => {
    const response = await apiClient.patch(`/api/batches/${batchId}/depart`);
    return response.data;
  },

  /**
   * Mark a batch as arrived (delivered)
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  markBatchArrived: async (batchId) => {
    const response = await apiClient.patch(`/api/batches/${batchId}/arrive`);
    return response.data;
  },
  
  /**
   * Close a batch after reconciliation is complete
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  closeBatch: async (batchId) => {
    try {
      const response = await apiClient.post(`/api/batches/${batchId}/close`);
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
      console.log(`Fetching reconciliation status for batch: ${batchId}`);
      const url = `/api/batches/${batchId}/reconciliation-status`;
      console.log(`API URL: ${url}`);
      const response = await apiClient.get(url);
      console.log('Reconciliation status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation status:', error.response?.data || error.message);
      console.error('Error details:', error);
      throw error;
    }
  },
};

export default batchService;
