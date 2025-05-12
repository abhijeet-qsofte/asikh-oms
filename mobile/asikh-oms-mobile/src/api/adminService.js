// src/api/adminService.js
import apiClient from './client';

/**
 * Service for admin-related API operations
 */
const adminService = {
  /**
   * Get all farms
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getFarms: async (params = {}) => {
    console.log('adminService.getFarms called with params:', params);
    try {
      const response = await apiClient.get('/api/farms/', { params });
      console.log('API response from getFarms:', response.data);
      
      // Extract farms array from the response
      if (response.data && response.data.farms) {
        console.log(`Found ${response.data.farms.length} farms in response`);
        return response.data.farms;
      } else {
        console.warn('Unexpected response structure from getFarms:', response.data);
        return [];
      }
    } catch (error) {
      console.error('API error in getFarms:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Create a new farm
   * @param {Object} farmData - The farm data
   * @returns {Promise} - The API response
   */
  createFarm: async (farmData) => {
    console.log('Creating farm with data:', JSON.stringify(farmData, null, 2));
    try {
      const response = await apiClient.post('/api/farms/', farmData);
      console.log('Farm creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Farm creation error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Update an existing farm
   * @param {string} farmId - The farm ID
   * @param {Object} farmData - The farm data to update
   * @returns {Promise} - The API response
   */
  updateFarm: async (farmId, farmData) => {
    console.log(`Updating farm ${farmId} with data:`, JSON.stringify(farmData, null, 2));
    try {
      const response = await apiClient.put(`/api/farms/${farmId}`, farmData);
      console.log('Farm update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Farm update error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get all packhouses
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getPackhouses: async (params = {}) => {
    console.log('adminService.getPackhouses called with params:', params);
    try {
      const response = await apiClient.get('/api/packhouses/', { params });
      console.log('API response from getPackhouses:', response.data);
      
      // Extract packhouses array from the response
      if (response.data && response.data.packhouses) {
        console.log(`Found ${response.data.packhouses.length} packhouses in response`);
        return response.data.packhouses;
      } else {
        console.warn('Unexpected response structure from getPackhouses:', response.data);
        return [];
      }
    } catch (error) {
      console.error('API error in getPackhouses:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Create a new packhouse
   * @param {Object} packhouseData - The packhouse data
   * @returns {Promise} - The API response
   */
  createPackhouse: async (packhouseData) => {
    try {
      const response = await apiClient.post('/api/packhouses/', packhouseData);
      return response.data;
    } catch (error) {
      console.error('Packhouse creation error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Update an existing packhouse
   * @param {string} packhouseId - The packhouse ID
   * @param {Object} packhouseData - The packhouse data to update
   * @returns {Promise} - The API response
   */
  updatePackhouse: async (packhouseId, packhouseData) => {
    console.log(`Updating packhouse ${packhouseId} with data:`, JSON.stringify(packhouseData, null, 2));
    try {
      const response = await apiClient.put(`/api/packhouses/${packhouseId}`, packhouseData);
      console.log('Packhouse update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Packhouse update error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get all varieties
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getVarieties: async (params = {}) => {
    console.log('adminService.getVarieties called with params:', params);
    try {
      const response = await apiClient.get('/api/varieties/', { params });
      console.log('API response from getVarieties:', response.data);
      
      // Extract varieties array from the response
      if (response.data && response.data.varieties) {
        console.log(`Found ${response.data.varieties.length} varieties in response`);
        return response.data.varieties;
      } else {
        console.warn('Unexpected response structure from getVarieties:', response.data);
        return [];
      }
    } catch (error) {
      console.error('API error in getVarieties:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Create a new variety
   * @param {Object} varietyData - The variety data
   * @returns {Promise} - The API response
   */
  createVariety: async (varietyData) => {
    try {
      const response = await apiClient.post('/api/varieties/', varietyData);
      return response.data;
    } catch (error) {
      console.error('Variety creation error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Update an existing variety
   * @param {string} varietyId - The variety ID
   * @param {Object} varietyData - The variety data to update
   * @returns {Promise} - The API response
   */
  updateVariety: async (varietyId, varietyData) => {
    console.log(`Updating variety ${varietyId} with data:`, JSON.stringify(varietyData, null, 2));
    try {
      const response = await apiClient.put(`/api/varieties/${varietyId}`, varietyData);
      console.log('Variety update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Variety update error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get all users
   * @param {Object} params - Query parameters
   * @returns {Promise} - The API response
   */
  getUsers: async (params = {}) => {
    console.log('adminService.getUsers called with params:', params);
    try {
      const response = await apiClient.get('/api/users/', { params });
      console.log('API response from getUsers:', response.data);
      
      // Extract users array from the response
      if (response.data && response.data.users) {
        console.log(`Found ${response.data.users.length} users in response`);
        return response.data.users;
      } else {
        console.warn('Unexpected response structure from getUsers:', response.data);
        return [];
      }
    } catch (error) {
      console.error('API error in getUsers:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Create a new user
   * @param {Object} userData - The user data
   * @returns {Promise} - The API response
   */
  createUser: async (userData) => {
    try {
      const response = await apiClient.post('/api/users/', userData);
      return response.data;
    } catch (error) {
      console.error('User creation error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Update an existing user
   * @param {string} userId - The user ID
   * @param {Object} userData - The user data to update
   * @returns {Promise} - The API response
   */
  updateUser: async (userId, userData) => {
    console.log(`Updating user ${userId} with data:`, JSON.stringify(userData, null, 2));
    try {
      const response = await apiClient.put(`/api/users/${userId}`, userData);
      console.log('User update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('User update error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default adminService;
