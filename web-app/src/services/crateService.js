/**
 * Crate service for handling all crate-related API operations
 */
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../constants/api';

/**
 * Service for crate-related API operations
 */
const crateService = {
  /**
   * Get a list of all crates
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getCrates: async (params = {}) => {
    try {
      // Ensure we have pagination parameters
      const queryParams = {
        page: params.page || 1,
        page_size: params.page_size || 20,
        ...params
      };
      
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATES}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error getting crates:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get a crate by ID
   * @param {string} crateId - The crate ID
   * @returns {Promise} - The API response
   */
  getCrateById: async (crateId) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATE_DETAIL(crateId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting crate ${crateId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get a crate by QR code
   * @param {string} qrCode - The QR code
   * @returns {Promise} - The API response
   */
  getCrateByQR: async (qrCode) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATE_BY_QR(qrCode)}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting crate by QR code ${qrCode}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Create a new crate
   * @param {Object} crateData - The crate data
   * @returns {Promise} - The API response
   */
  createCrate: async (crateData) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.CRATES}`, crateData);
      return response.data;
    } catch (error) {
      console.error('Error creating crate:', error.response?.data || error.message);
      
      // Handle validation errors
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
      
      throw error;
    }
  },

  /**
   * Update a crate
   * @param {string} crateId - The crate ID
   * @param {Object} crateData - The crate data to update
   * @returns {Promise} - The API response
   */
  updateCrate: async (crateId, crateData) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.CRATE_DETAIL(crateId)}`, crateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating crate ${crateId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Assign a crate to a batch
   * @param {string} crateId - The crate ID
   * @param {string} batchId - The batch ID
   * @returns {Promise} - The API response
   */
  assignCrateToBatch: async (crateId, batchId) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.CRATE_ASSIGN_BATCH}`, {
        crate_id: crateId,
        batch_id: batchId
      });
      return response.data;
    } catch (error) {
      console.error(`Error assigning crate ${crateId} to batch ${batchId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Search for crates
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} - The API response
   */
  searchCrates: async (searchParams) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATE_SEARCH}`, { params: searchParams });
      return response.data;
    } catch (error) {
      console.error('Error searching crates:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get available crates (not assigned to any batch)
   * @returns {Promise} - The API response
   */
  getAvailableCrates: async () => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATE_SEARCH}`, { 
        params: { unassigned: true } 
      });
      return response.data;
    } catch (error) {
      console.error('Error getting available crates:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Validate a QR code
   * @param {string} qrCode - The QR code to validate
   * @returns {Promise} - The API response
   */
  validateQRCode: async (qrCode) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.QR_CODE_VALIDATE(qrCode)}`);
      return response.data;
    } catch (error) {
      console.error(`Error validating QR code ${qrCode}:`, error.response?.data || error.message);
      throw error;
    }
  }
};

export default crateService;
