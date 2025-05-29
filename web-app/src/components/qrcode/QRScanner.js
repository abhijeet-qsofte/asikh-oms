import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, TextField, IconButton } from '@mui/material';
import { 
  Camera as CameraIcon, 
  CameraAlt as CameraAltIcon, 
  FlipCameraAndroid as FlipCameraIcon,
  QrCode as QrCodeIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { initCamera, stopCamera, capturePhoto } from '../../services/cameraService';

/**
 * QR Scanner component for web app
 * Uses the browser's camera API to scan QR codes
 * Also provides a manual entry option for QR codes
 */
const QRScanner = ({ onScan, onError, onClose }) => {
  const [hasCamera, setHasCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front
  const [manualEntry, setManualEntry] = useState(false);
  const [manualQRCode, setManualQRCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scannerRef = useRef(null);
  
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
        if (!hasVideoInput) {
          setManualEntry(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking camera:', error);
        setHasCamera(false);
        setError('Failed to check camera availability');
        setManualEntry(true);
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
  
  // Initialize camera when scanning starts
  useEffect(() => {
    if (scanning && hasCamera && !cameraInitialized) {
      startCamera();
    }
    
    // Load QR code scanner library
    if (scanning && !scannerRef.current) {
      loadQRScanner();
    }
    
    return () => {
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
  }, [scanning, hasCamera, cameraInitialized]);
  
  // Start the camera
  const startCamera = async () => {
    try {
      setLoading(true);
      const stream = await initCamera('qr-video', facingMode);
      streamRef.current = stream;
      setCameraInitialized(true);
      setLoading(false);
    } catch (error) {
      console.error('Error starting camera:', error);
      setError(`Camera error: ${error.message}`);
      setHasCamera(false);
      setManualEntry(true);
      setLoading(false);
    }
  };
  
  // Load the QR code scanner library
  const loadQRScanner = async () => {
    try {
      // Dynamically import jsQR
      const jsQR = (await import('jsqr')).default;
      scannerRef.current = jsQR;
      
      // Start scanning
      if (cameraInitialized) {
        scanQRCode();
      }
    } catch (error) {
      console.error('Error loading QR scanner:', error);
      setError('Failed to load QR scanner');
    }
  };
  
  // Scan for QR codes in the video stream
  const scanQRCode = () => {
    if (!scanning || !cameraInitialized || !scannerRef.current) return;
    
    const video = document.getElementById('qr-video');
    if (!video) return;
    
    // Create a canvas to capture video frames
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Function to scan a single frame
    const scanFrame = () => {
      if (!scanning || !cameraInitialized) return;
      
      // Draw the current video frame on the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data from the canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Scan for QR code
      const code = scannerRef.current(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        // QR code found
        console.log('QR code found:', code.data);
        handleScan(code.data);
      } else {
        // Continue scanning
        requestAnimationFrame(scanFrame);
      }
    };
    
    // Start scanning
    scanFrame();
  };
  
  // Handle successful QR code scan
  const handleScan = (data) => {
    setScanning(false);
    if (streamRef.current) {
      stopCamera(streamRef.current);
      streamRef.current = null;
    }
    
    if (onScan) {
      onScan(data);
    }
  };
  
  // Handle manual QR code entry
  const handleManualSubmit = () => {
    if (manualQRCode.trim()) {
      handleScan(manualQRCode.trim());
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
  
  // Toggle between camera and manual entry
  const toggleManualEntry = () => {
    if (scanning) {
      setScanning(false);
      if (streamRef.current) {
        stopCamera(streamRef.current);
        streamRef.current = null;
      }
    }
    
    setManualEntry(!manualEntry);
  };
  
  // Start scanning
  const handleStartScanning = () => {
    setScanning(true);
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
  
  // Render manual entry form
  if (manualEntry) {
    return (
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <Box display="flex" flexDirection="column" p={2}>
          <Typography variant="h6" gutterBottom>
            Enter QR Code Manually
          </Typography>
          
          <TextField
            label="QR Code"
            variant="outlined"
            fullWidth
            value={manualQRCode}
            onChange={(e) => setManualQRCode(e.target.value)}
            placeholder="Enter QR code value"
            sx={{ mb: 2, mt: 1 }}
          />
          
          <Box display="flex" justifyContent="space-between" mt={2}>
            {hasCamera && (
              <Button 
                variant="outlined" 
                startIcon={<CameraIcon />}
                onClick={toggleManualEntry}
              >
                Use Camera
              </Button>
            )}
            
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<CheckIcon />}
              onClick={handleManualSubmit}
              disabled={!manualQRCode.trim()}
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  }
  
  // Render camera view
  return (
    <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h6" gutterBottom>
          Scan QR Code
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
          {!scanning ? (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center"
              height="100%"
            >
              <QrCodeIcon sx={{ fontSize: 80, color: '#fff', mb: 2 }} />
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<CameraAltIcon />}
                onClick={handleStartScanning}
              >
                Start Scanning
              </Button>
            </Box>
          ) : (
            <video 
              id="qr-video" 
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
            startIcon={<QrCodeIcon />}
            onClick={toggleManualEntry}
          >
            Manual Entry
          </Button>
          
          {scanning && (
            <IconButton 
              color="primary" 
              onClick={switchCamera}
              disabled={!hasCamera}
            >
              <FlipCameraIcon />
            </IconButton>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default QRScanner;
