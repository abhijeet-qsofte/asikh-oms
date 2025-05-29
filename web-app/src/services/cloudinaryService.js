/**
 * Cloudinary service for image uploads
 *
 * This service handles direct uploads to Cloudinary from the browser
 * using the unsigned upload method. For production, consider using
 * signed uploads with backend authentication.
 */

// Cloudinary upload preset - you'll need to create this in your Cloudinary dashboard
// This should be an "unsigned" upload preset for client-side uploads
const CLOUDINARY_UPLOAD_PRESET = 'asikh_oms_unsigned';
const CLOUDINARY_CLOUD_NAME = 'dockpfapm'; // Replace with your Cloudinary cloud name

/**
 * Uploads an image to Cloudinary
 * @param {string} imageDataUrl - Base64 encoded image data URL
 * @param {string} folder - Optional folder path in Cloudinary
 * @returns {Promise<Object>} - Cloudinary response with image details
 */
export const uploadImage = async (imageDataUrl, folder = 'crates') => {
  try {
    // Convert data URL to blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    // Upload to Cloudinary
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Cloudinary upload successful:', uploadResult);

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Optimizes an image before upload
 * @param {string} dataUrl - Base64 encoded image data URL
 * @param {number} maxWidth - Maximum width of the image
 * @param {number} quality - Image quality (0-1)
 * @returns {Promise<string>} - Optimized image data URL
 */
export const optimizeImage = (dataUrl, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions if needed
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to optimized JPEG
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
};
