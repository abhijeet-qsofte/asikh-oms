/**
 * Camera service for handling photo capture in the web app
 */

/**
 * Initialize the camera and return a video stream
 * @param {string} videoElementId - ID of the video element to attach the stream to
 * @param {boolean} facingMode - Camera facing mode ('user' for front camera, 'environment' for back camera)
 * @returns {Promise<MediaStream>} - The video stream
 */
export const initCamera = async (videoElementId, facingMode = 'environment') => {
  try {
    const videoElement = document.getElementById(videoElementId);
    
    if (!videoElement) {
      throw new Error(`Video element with ID ${videoElementId} not found`);
    }
    
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support camera access');
    }
    
    // Get user media with preferred camera
    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Attach stream to video element
    videoElement.srcObject = stream;
    
    // Wait for video to be ready
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve(stream);
      };
    });
  } catch (error) {
    console.error('Error initializing camera:', error);
    throw error;
  }
};

/**
 * Stop a video stream
 * @param {MediaStream} stream - The video stream to stop
 */
export const stopCamera = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

/**
 * Capture a photo from the video stream
 * @param {string} videoElementId - ID of the video element with the stream
 * @param {number} quality - Image quality (0-1)
 * @returns {string} - Data URL of the captured image
 */
export const capturePhoto = (videoElementId, quality = 0.8) => {
  try {
    const videoElement = document.getElementById(videoElementId);
    
    if (!videoElement) {
      throw new Error(`Video element with ID ${videoElementId} not found`);
    }
    
    // Create a canvas element to capture the image
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Draw the video frame on the canvas
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/jpeg', quality);
  } catch (error) {
    console.error('Error capturing photo:', error);
    throw error;
  }
};

/**
 * Optimize an image before upload
 * @param {string} dataUrl - Base64 encoded image data URL
 * @param {number} maxWidth - Maximum width of the image
 * @param {number} quality - Image quality (0-1)
 * @returns {Promise<string>} - Optimized image data URL
 */
export const optimizeImage = async (dataUrl, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        // Create canvas with new dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get data URL with specified quality
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };
      
      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Check if the device has a camera
 * @returns {Promise<boolean>} - True if the device has a camera
 */
export const hasCamera = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error checking for camera:', error);
    return false;
  }
};

/**
 * Get available cameras
 * @returns {Promise<MediaDeviceInfo[]>} - List of available cameras
 */
export const getAvailableCameras = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('Media devices API not supported');
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error getting available cameras:', error);
    throw error;
  }
};
