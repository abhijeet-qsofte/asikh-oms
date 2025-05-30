import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  QrCodeScanner as QrCodeScannerIcon,
  PhotoCamera as PhotoCameraIcon,
  MyLocation as MyLocationIcon,
  LocationOn as LocationOnIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { createCrate, clearCrateErrors } from '../../store/slices/crateSlice';
import { getBatches } from '../../store/slices/batchSlice';
import { getVarieties, getUsers } from '../../store/slices/adminSlice';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { uploadImage, optimizeImage } from '../../services/cloudinaryService';

const CrateCreatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user = {} } = useSelector((state) => state.auth || {});
  // Access batches data directly from state - note the plural 'batches' key
  const batchState = useSelector((state) => state.batches);
  const batches = batchState?.batches || [];
  const batchesLoading = batchState?.loading || false;
  
  // Debug batches data
  useEffect(() => {
    console.log('Batch state:', batchState);
    console.log('Batches array:', batches);
  }, [batchState, batches]);
  const { varieties: { data: varieties = [] } = {}, users: { data: users = [] } = {} } = useSelector((state) => state.admin || {});
  const { createLoading = false, createError = null } = useSelector((state) => state.crates || {});

  // State for form data
  const [formData, setFormData] = useState({
    qr_code: '',
    batch_id: '',
    weight: '',
    supervisor_id: user?.id || '',
    variety_id: '',
    grade: 'A',
    notes: '',
  });

  // State for location
  const [coordinates, setCoordinates] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // State for QR code scanner
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const qrScannerRef = useRef(null);

  // State for camera
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const streamRef = useRef(null);

  // State for snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Grade options
  const gradeOptions = ['A', 'B', 'C'];

  // Filter active batches
  const activeBatches = Array.isArray(batches) 
    ? batches.filter(batch => {
        const status = batch?.status ? batch.status.toLowerCase() : '';
        return !['completed', 'reconciled', 'delivered', 'closed'].includes(status);
      })
    : [];

  useEffect(() => {
    // Fetch required data
    console.log('Dispatching getBatches');
    dispatch(getBatches());
    dispatch(getVarieties());
    dispatch(getUsers());
    
    // Clean up on unmount
    return () => {
      dispatch(clearCrateErrors());
      stopCamera();
    };
  }, [dispatch]);

  // Form change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // QR Code Scanner functions
  const openQrScanner = () => {
    setQrScannerOpen(true);
    
    // Initialize QR scanner after dialog is open
    setTimeout(() => {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: 250 },
          false
        );

        qrScannerRef.current.render(
          (decodedText) => {
            // QR code scanned successfully
            setFormData(prev => ({
              ...prev,
              qr_code: decodedText
            }));
            setSnackbarMessage(`QR Code scanned: ${decodedText}`);
            setSnackbarOpen(true);
            closeQrScanner();
          },
          (errorMessage) => {
            // Error handling
            console.error("QR Code scanning error:", errorMessage);
          }
        );
      }
    }, 500);
  };

  const closeQrScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear();
    }
    setQrScannerOpen(false);
  };

  // Camera functions
  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setSnackbarMessage("Could not access camera");
      setSnackbarOpen(true);
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !photoRef.current) return;
    
    const video = videoRef.current;
    const photo = photoRef.current;
    const context = photo.getContext('2d');

    // Set canvas dimensions to match video
    photo.width = video.videoWidth;
    photo.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, photo.width, photo.height);

    // Convert to data URL
    const imageDataUrl = photo.toDataURL('image/jpeg');
    setCapturedImage(imageDataUrl);

    setSnackbarMessage("Photo captured successfully");
    setSnackbarOpen(true);
    closeCamera();
  };
  
  // Function to handle image upload to Cloudinary
  const handleImageUpload = async () => {
    if (!capturedImage) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // First optimize the image to reduce size
      const optimizedImage = await optimizeImage(capturedImage);
      setUploadProgress(30);
      
      // Upload to Cloudinary
      const uploadResult = await uploadImage(optimizedImage, 'asikh_oms/crates');
      setUploadProgress(100);
      
      // Store the Cloudinary URL
      setCloudinaryUrl(uploadResult.url);
      
      setSnackbarMessage("Image uploaded successfully");
      setSnackbarOpen(true);
      
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setSnackbarMessage("Failed to upload image");
      setSnackbarOpen(true);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // GPS Location functions
  const handleLocationDetection = () => {
    if (!navigator.geolocation) {
      setSnackbarMessage("Geolocation is not supported by your browser");
      setSnackbarOpen(true);
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Store coordinates for display
        setCoordinates({
          latitude,
          longitude,
          accuracy
        });
        
        setLocationLoading(false);
        setSnackbarMessage(`Location detected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setSnackbarOpen(true);
      },
      (error) => {
        setLocationLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location services.');
            setPermissionDenied(true);
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('An unknown error occurred while getting location.');
            break;
        }
        
        setSnackbarMessage(`Error detecting location: ${error.message}`);
        setSnackbarOpen(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // If we have a captured image, upload it to Cloudinary first
      let imageUrl = null;
      if (capturedImage) {
        setSnackbarMessage("Uploading image to Cloudinary...");
        setSnackbarOpen(true);
        imageUrl = await handleImageUpload();
      }
      
      // Validate required fields
      if (!formData.batch_id) {
        setSnackbarMessage("Please select a batch");
        setSnackbarOpen(true);
        return;
      }
      
      if (!formData.weight) {
        setSnackbarMessage("Weight is required");
        setSnackbarOpen(true);
        return;
      }
      
      if (!formData.supervisor_id) {
        setSnackbarMessage("Supervisor is required");
        setSnackbarOpen(true);
        return;
      }
      
      if (!coordinates) {
        setSnackbarMessage("Location detection is required");
        setSnackbarOpen(true);
        return;
      }
      
      // Format data for submission according to backend requirements
      const crateData = {
        qr_code: formData.qr_code,
        batch_id: formData.batch_id,
        weight: parseFloat(formData.weight),
        notes: formData.notes,
        variety_id: formData.variety_id || null,
        grade: formData.grade,
        supervisor_id: formData.supervisor_id,
        // Format GPS location as required by the backend (with lat and lng properties)
        gps_location: {
          lat: coordinates.latitude,
          lng: coordinates.longitude
        }
      };
      
      // Add the image URL if available
      if (imageUrl) {
        crateData.image_url = imageUrl;
      }
      
      setSnackbarMessage("Creating crate...");
      setSnackbarOpen(true);
      
      console.log('Submitting crate data:', crateData);
      
      const resultAction = await dispatch(createCrate(crateData));
      
      if (createCrate.fulfilled.match(resultAction)) {
        setSnackbarMessage("Crate created successfully!");
        setSnackbarOpen(true);
        navigate(`/crates/${resultAction.payload.id}`);
      } else {
        // Handle API errors
        const errorData = resultAction.payload || resultAction.error;
        let errorMessage = "Failed to create crate";
        
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage += ": " + errorData.detail.map(err => err.msg).join(', ');
        } else if (typeof errorData === 'string') {
          errorMessage += ": " + errorData;
        }
        
        console.error('API Error:', errorData);
        setSnackbarMessage(errorMessage);
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      setSnackbarMessage("Failed to create crate: " + (error.message || 'Unknown error'));
      setSnackbarOpen(true);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crates')}
          sx={{ mb: 2 }}
        >
          Back to Crates
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Crate
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          {createError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {createError}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* QR Code */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <TextField
                    name="qr_code"
                    label="QR Code"
                    fullWidth
                    value={formData.qr_code}
                    onChange={handleChange}
                    helperText="Scan or enter a QR code"
                  />
                  <IconButton 
                    color="primary" 
                    onClick={openQrScanner}
                    sx={{ ml: 1, mt: 1 }}
                    title="Scan QR Code"
                  >
                    <QrCodeScannerIcon />
                  </IconButton>
                </Box>
              </Grid>
              
              {/* Batch Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="batch-label">Batch</InputLabel>
                  <Select
                    labelId="batch-label"
                    name="batch_id"
                    value={formData.batch_id}
                    onChange={handleChange}
                    label="Batch"
                    required
                    disabled={batchesLoading}
                  >
                    <MenuItem value="">Select a batch</MenuItem>
                    {batchesLoading ? (
                      <MenuItem disabled>Loading batches...</MenuItem>
                    ) : batches.length === 0 ? (
                      <MenuItem disabled>No batches available</MenuItem>
                    ) : (
                      batches.map((batch) => {
                        // Only show batches that are not completed, reconciled, delivered, or closed
                        const status = batch?.status ? batch.status.toLowerCase() : '';
                        if (!['completed', 'reconciled', 'delivered', 'closed'].includes(status)) {
                          return (
                            <MenuItem key={batch.id} value={batch.id}>
                              Batch #{batch.batch_code || batch.id}
                              {batch.farm ? ` - ${batch.farm.name || 'Unknown Farm'}` : ''}
                              {batch.variety ? ` (${batch.variety.name || 'Unknown Variety'})` : ''}
                            </MenuItem>
                          );
                        }
                        return null;
                      }).filter(Boolean)
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Location Detection */}
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  startIcon={locationLoading ? <CircularProgress size={20} /> : <LocationOnIcon />}
                  onClick={handleLocationDetection}
                  disabled={locationLoading}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  {locationLoading ? "Detecting Location..." : "Detect Location"}
                </Button>
                {permissionDenied && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      setPermissionDenied(false);
                      handleLocationDetection();
                    }}
                    startIcon={<MyLocationIcon />}
                    size="small"
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Request Permission Again
                  </Button>
                )}
                {locationError && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    {locationError}
                  </Typography>
                )}
                {coordinates && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    Location: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                  </Typography>
                )}
              </Grid>
              
              {/* Photo Capture */}
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={openCamera}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  Take Photo
                </Button>
                {capturedImage && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ textAlign: 'center', mb: 1 }}>
                      <img 
                        src={cloudinaryUrl || capturedImage} 
                        alt="Captured crate" 
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} 
                      />
                    </Box>
                    {isUploading && (
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress} />
                        <Typography variant="caption" align="center" display="block">
                          Uploading image: {uploadProgress}%
                        </Typography>
                      </Box>
                    )}
                    {cloudinaryUrl && (
                      <Typography variant="caption" color="success.main" align="center" display="block">
                        Image uploaded to Cloudinary
                      </Typography>
                    )}
                  </Box>
                )}
              </Grid>
              
              {/* Weight */}
              <Grid item xs={12} md={6}>
                <TextField
                  name="weight"
                  label="Weight (kg)"
                  type="number"
                  fullWidth
                  value={formData.weight}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText="Weight of the crate"
                  required
                />
              </Grid>
              
              {/* Supervisor */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="supervisor-label">Supervisor</InputLabel>
                  <Select
                    labelId="supervisor-label"
                    name="supervisor_id"
                    value={formData.supervisor_id}
                    onChange={handleChange}
                    label="Supervisor"
                    required
                  >
                    {users && users.length > 0 ? (
                      users.map((supervisor) => (
                        <MenuItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name || supervisor.username || supervisor.email}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value={user?.id || ''}>
                        {user?.full_name || user?.username || user?.email || 'Current User'}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Variety */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="variety-label">Mango Variety</InputLabel>
                  <Select
                    labelId="variety-label"
                    name="variety_id"
                    value={formData.variety_id}
                    onChange={handleChange}
                    label="Mango Variety"
                  >
                    <MenuItem value="">
                      <em>Select variety (optional)</em>
                    </MenuItem>
                    {varieties && varieties.map((variety) => (
                      <MenuItem key={variety.id} value={variety.id}>
                        {variety.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Grade */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="grade-label">Grade</InputLabel>
                  <Select
                    labelId="grade-label"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    label="Grade"
                  >
                    {gradeOptions.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        Grade {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Notes"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add any information about the crate here"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate('/crates')}
                  sx={{ mr: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={createLoading}
                  startIcon={createLoading ? <CircularProgress size={24} /> : <SaveIcon />}
                >
                  {createLoading ? "Creating..." : "Create Crate"}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
      
      {/* QR Code Scanner Dialog */}
      <Dialog
        open={qrScannerOpen}
        onClose={closeQrScanner}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          <Box id="qr-reader" sx={{ width: '100%' }}></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQrScanner}>Cancel</Button>
        </DialogActions>
      </Dialog>
      
      {/* Camera Dialog */}
      <Dialog
        open={cameraOpen}
        onClose={closeCamera}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Take Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative' }}>
            <video 
              ref={videoRef} 
              style={{ width: '100%', display: cameraOpen ? 'block' : 'none' }} 
              autoPlay
            />
            <canvas 
              ref={photoRef} 
              style={{ display: 'none' }} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCamera}>Cancel</Button>
          <Button onClick={takePhoto} color="primary">
            Capture
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        action={
          <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default CrateCreatePage;
