/**
 * Reconciliation service for handling all reconciliation-related API operations
 */
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../constants/api';

/**
 * Service for reconciliation-related API operations
 */
const reconciliationService = {
  /**
   * Get reconciliation statistics for a batch
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getReconciliationStats: async (batchId) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_RECONCILIATION_STATS(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting reconciliation stats for batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get reconciliation status for a batch
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
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
   * Reconcile a crate in a batch
   * @param {string} batchId - The batch ID
   * @param {string} qrCode - The crate QR code
   * @param {number} weight - The reconciled weight
   * @param {string} photoUrl - URL of the crate photo
   * @returns {Promise} - The API response
   */
  reconcileCrate: async (batchId, qrCode, weight, photoUrl = null) => {
    try {
      const reconciliationData = {
        qr_code: qrCode,
        weight: weight
      };
      
      if (photoUrl) {
        reconciliationData.photo_url = photoUrl;
      }
      
      const response = await axios.post(
        `${API_URL}${ENDPOINTS.BATCH_RECONCILE_CRATE(batchId)}`, 
        reconciliationData
      );
      return response.data;
    } catch (error) {
      console.error(`Error reconciling crate ${qrCode} in batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get batch reconciliation summary
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getBatchReconciliationSummary: async (batchId) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.RECONCILIATION_BATCH_SUMMARY(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting reconciliation summary for batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get batch reconciliation logs
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  getBatchReconciliationLogs: async (batchId) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.RECONCILIATION_BATCH_LOGS(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting reconciliation logs for batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Complete batch reconciliation
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  completeBatchReconciliation: async (batchId) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.RECONCILIATION_BATCH_COMPLETE(batchId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error completing reconciliation for batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Search for reconciliation records
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} - The API response
   */
  searchReconciliation: async (searchParams) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.RECONCILIATION_SEARCH}`, { params: searchParams });
      return response.data;
    } catch (error) {
      console.error('Error searching reconciliation records:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get overall reconciliation statistics
   * @returns {Promise} - The API response
   */
  getOverallReconciliationStats: async () => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.RECONCILIATION_STATS}`);
      return response.data;
    } catch (error) {
      console.error('Error getting overall reconciliation stats:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default reconciliationService;
