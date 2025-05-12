// src/api/reconciliationService.js
import apiClient from './client';

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
      const response = await apiClient.post(`/api/batches/${batchId}/reconcile`, { qr_code: qrCode });
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
      const response = await apiClient.get(`/api/batches/${batchId}/reconciliation-stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reconciliation stats:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default reconciliationService;
