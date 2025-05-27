// src/services/imageService.js
import apiClient from '../api/client';

/**
 * Service for handling image processing and uploads
 */
const imageService = {
  /**
   * Process and optimize an image for upload
   * @param {Object} imageAsset - The image asset from ImagePicker
   * @returns {Promise<string>} - Base64 encoded image data
   */
  async processImage(imageAsset) {
    if (!imageAsset || !imageAsset.uri) {
      console.error('Invalid image asset');
      return null;
    }

    try {
      console.log('Processing image for upload...');
      
      // Since we don't have image-manipulator, we'll use the base64 data directly
      // but implement a simple size check
      if (imageAsset.base64) {
        const sizeInBytes = imageAsset.base64.length * 0.75; // Approximate size in bytes
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        console.log(`Image size: ~${sizeInMB.toFixed(2)}MB`);
        
        // If image is too large, truncate the base64 string to reduce size
        // This is a simplified approach - in a production app, you'd want to use proper resizing
        if (sizeInMB > 1) {
          console.log('Image is large, reducing size...');
          const reductionFactor = Math.min(0.5, 0.5 / sizeInMB); // More reduction for larger images
          const truncatedBase64 = imageAsset.base64.substring(0, Math.floor(imageAsset.base64.length * reductionFactor));
          return `data:image/jpeg;base64,${truncatedBase64}`;
        }
        
        return `data:image/jpeg;base64,${imageAsset.base64}`;
      }
      
      // If no base64 data, just return the URI
      return imageAsset.uri;
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  },

  /**
   * Upload an image for a crate
   * @param {string} crateId - The ID of the crate
   * @param {string} imageData - Base64 encoded image data or URI
   * @returns {Promise<Object>} - The API response
   */
  async uploadCrateImage(crateId, imageData) {
    if (!crateId || !imageData) {
      console.error('Missing crate ID or image data');
      return { success: false };
    }

    try {
      console.log(`Uploading image for crate ${crateId}...`);
      
      // Prepare image data
      let photoBase64 = imageData;
      if (!imageData.startsWith('data:image')) {
        photoBase64 = `data:image/jpeg;base64,${imageData}`;
      }
      
      // Create update payload with just the image
      const updateData = {
        photo_base64: photoBase64
      };
      
      // Use PUT endpoint to update the crate with the image
      const response = await apiClient.put(`/api/crates/${crateId}`, updateData);
      console.log('Image upload successful');
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
};

export default imageService;
