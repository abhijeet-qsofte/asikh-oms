import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, IconButton } from '@mui/material';
import { 
  Camera as CameraIcon, 
  CameraAlt as CameraAltIcon, 
  FlipCameraAndroid as FlipCameraIcon,
  Photo as PhotoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { initCamera, stopCamera, capturePhoto, optimizeImage } from '../../services/cameraService';
import { uploadImage } from '../../services/cloudinaryService';

/**
 * Photo Capture component for web app
 * Uses the browser's camera API to take photos of crates
 */
const PhotoCapture = ({ onCapture, onError, onClose }) => {
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Check if the device has a camera
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setHasCamera(false);
          setError('Your browser does not support camera access');
          setLoading(false);
          return;
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoInput = devices.some(device => device.kind === 'videoinput');
        
        setHasCamera(hasVideoInput);
        setLoading(false);
      } catch (error) {
        console.error('Error checking camera:', error);
        setHasCamera(false);
        setError('Failed to check camera availability');
        setLoading(false);
      }
    };
    
    checkCamera();
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
  }, []);
  
  // Initialize camera when active
  useEffect(() => {
    if (cameraActive && hasCamera && !cameraInitialized) {
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
  }, [cameraActive, hasCamera, cameraInitialized]);
  
  // Start the camera
  const startCamera = async () => {
    try {
      setLoading(true);
      const stream = await initCamera('camera-video', facingMode);
      streamRef.current = stream;
      setCameraInitialized(true);
      setLoading(false);
    } catch (error) {
      console.error('Error starting camera:', error);
      setError(`Camera error: ${error.message}`);
      setHasCamera(false);
      setLoading(false);
    }
  };
  
  // Switch camera (front/back)
  const switchCamera = () => {
    if (streamRef.current) {
      stopCamera(streamRef.current);
      streamRef.current = null;
    }
    
    setCameraInitialized(false);
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
    
    // Restart camera with new facing mode
    setTimeout(() => {
      startCamera();
    }, 300);
  };
  
  // Capture photo from camera
  const handleCapture = () => {
    if (!cameraInitialized) return;
    
    try {
      const photoDataUrl = capturePhoto('camera-video');
      setCapturedImage(photoDataUrl);
      setCameraActive(false);
      
      // Stop the camera after capturing
      if (streamRef.current) {
        stopCamera(streamRef.current);
        streamRef.current = null;
        setCameraInitialized(false);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      setError(`Failed to capture photo: ${error.message}`);
    }
  };
  
  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCameraActive(true);
  };
  
  // Upload captured image to Cloudinary
  const handleUpload = async () => {
    if (!capturedImage) return;
    
    try {
      setUploading(true);
      
      // Optimize the image before upload
      const optimizedImage = await optimizeImage(capturedImage, 1200, 0.8);
      
      // Upload to Cloudinary
      const uploadResult = await uploadImage(optimizedImage, 'crates');
      
      setUploading(false);
      
      // Call the onCapture callback with the upload result
      if (onCapture) {
        onCapture(uploadResult);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(`Failed to upload image: ${error.message}`);
      setUploading(false);
      
      if (onError) {
        onError(error);
      }
    }
  };
  
  // Start the camera
  const handleStartCamera = () => {
    setCameraActive(true);
    setError(null);
  };
  
  // Render loading state
  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={3}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Initializing camera...</Typography>
        </Box>
      </Paper>
    );
  }
  
  // Render error state if no camera available
  if (!hasCamera && !capturedImage) {
    return (
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <Box display="flex" flexDirection="column" alignItems="center" p={3}>
          <PhotoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Camera Not Available
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" paragraph>
            {error || 'Your device does not have a camera or camera access is not available.'}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
      </Paper>
    );
  }
  
  // Render captured image preview
  if (capturedImage) {
    return (
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h6" gutterBottom>
            Photo Preview
          </Typography>
          
          <Box 
            sx={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: 400,
              height: 300,
              mb: 2,
              border: '1px solid #ccc',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <img 
              src={capturedImage} 
              alt="Captured" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }} 
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" width="100%" mt={1}>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={handleRetake}
              disabled={uploading}
            >
              Retake
            </Button>
            
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<PhotoIcon />}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Use Photo'}
            </Button>
          </Box>
          
          {uploading && (
            <Box display="flex" alignItems="center" mt={2}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">Uploading photo...</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    );
  }
  
  // Render camera view
  return (
    <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h6" gutterBottom>
          Take Crate Photo
        </Typography>
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Box 
          sx={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: 400,
            height: 300,
            mb: 2,
            border: '1px solid #ccc',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: '#000'
          }}
        >
          {!cameraActive ? (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center"
              height="100%"
            >
              <CameraIcon sx={{ fontSize: 80, color: '#fff', mb: 2 }} />
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<CameraAltIcon />}
                onClick={handleStartCamera}
              >
                Start Camera
              </Button>
            </Box>
          ) : (
            <video 
              id="camera-video" 
              ref={videoRef}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover'
              }}
            />
          )}
        </Box>
        
        <Box display="flex" justifyContent="space-between" width="100%" mt={1}>
          <Button 
            variant="outlined" 
            onClick={onClose}
          >
            Cancel
          </Button>
          
          {cameraActive && (
            <>
              <IconButton 
                color="primary" 
                onClick={switchCamera}
              >
                <FlipCameraIcon />
              </IconButton>
              
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<CameraAltIcon />}
                onClick={handleCapture}
              >
                Capture
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default PhotoCapture;
