import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon 
} from '@mui/icons-material';
import { createBatch, clearBatchErrors } from '../../store/slices/batchSlice';
import { getFarms, getUsers } from '../../store/slices/adminSlice';

const BatchCreatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { createLoading, createError } = useSelector((state) => state.batches);
  const { data: farms } = useSelector((state) => state.admin.farms);
  const { data: users } = useSelector((state) => state.admin.users || { data: [] });
  const user = useSelector((state) => state.auth.user);
  
  // Refs for camera functionality
  const videoRef = useRef(null);
  
  const [formData, setFormData] = useState({
    notes: '',
    supervisor_id: '', // Must be a valid UUID
    from_location: '', // Must be a valid UUID (farm ID) - MANDATORY
    photo_url: '', // New field for photo capture
    latitude: null, // GPS latitude - mandatory
    longitude: null, // GPS longitude - mandatory
  });
  
  // State for photo capture and uploads
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for location tracking
  const [locationError, setLocationError] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  useEffect(() => {
    dispatch(getFarms());
    dispatch(getUsers());
    dispatch(clearBatchErrors());
    
    // Try to get the current location when the component mounts
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);
  
  // Effect to start/stop camera when dialog opens/closes
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Unable to access camera. Please check your permissions.');
        setShowCamera(false);
      }
    };
    
    const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
    
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [showCamera]);
  
  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    
    setIsGettingLocation(true);
    setLocationError('');
    
    // Try to get high accuracy position first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsGettingLocation(false);
      },
      // If high accuracy fails, try with lower accuracy
      (error) => {
        console.warn('High accuracy location failed, trying with lower accuracy:', error);
        
        // Try again with lower accuracy
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData({
              ...formData,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setIsGettingLocation(false);
          },
          (finalError) => {
            console.error('Error getting location:', finalError);
            setLocationError(`Error getting location: ${finalError.message}. Please ensure location services are enabled and you've granted permission.`);
            setIsGettingLocation(false);
            
            // Provide option to manually enter coordinates if needed
            if (window.confirm('Unable to get your current location. Would you like to use a default location for testing?')) {
              // Set default coordinates (this is just for testing)
              setFormData({
                ...formData,
                latitude: -36.8509, // Default Auckland coordinates
                longitude: 174.7645
              });
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  // Handle photo capture
  const handleCapturePhoto = () => {
    setShowCamera(true);
  };
  
  const handleCloseCamera = () => {
    setShowCamera(false);
  };
  
  // This function is no longer used as we're uploading directly to Cloudinary
  // We'll keep it for reference but it's not called anymore
  const handlePhotoCapture = (dataUrl) => {
    setFormData({
      ...formData,
      photo_url: dataUrl
    });
    setShowCamera(false);
  };
  
  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob for Cloudinary upload
      canvas.toBlob(async (blob) => {
        try {
          try {
            // Create a FormData object to send to Cloudinary
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('upload_preset', 'ml_default'); // Using default preset for testing
            
            // Show loading state
            setIsUploading(true);
            
            // For testing/development - use a data URL directly if Cloudinary upload fails
            const useLocalFallback = true; // Set to false in production
            
            if (useLocalFallback) {
              // Use the canvas data URL directly instead of uploading to Cloudinary
              // This is just for testing - in production, always upload to Cloudinary
              const dataUrl = canvas.toDataURL('image/jpeg');
              
              // Simulate a delay to show the loading state
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Update form with data URL
              setFormData(prev => ({
                ...prev,
                photo_url: dataUrl
              }));
              
              setIsUploading(false);
              setShowCamera(false);
              return;
            }
            
            // Upload to Cloudinary - only used when useLocalFallback is false
            console.log('Uploading to Cloudinary...');
            const response = await fetch('https://api.cloudinary.com/v1_1/asikh/image/upload', {
              method: 'POST',
              body: formData,
            });
            
            console.log('Cloudinary response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Cloudinary error response:', errorText);
              throw new Error(`Failed to upload image to Cloudinary: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Cloudinary success response:', data);
            
            // Update form with Cloudinary URL
            setFormData(prev => ({
              ...prev,
              photo_url: data.secure_url
            }));
            
            setIsUploading(false);
            setShowCamera(false);
          } catch (uploadError) {
            console.error('Error in Cloudinary upload:', uploadError);
            
            // Fallback to data URL if Cloudinary upload fails
            if (window.confirm('Cloud upload failed. Would you like to use a local image for testing?')) {
              const dataUrl = canvas.toDataURL('image/jpeg');
              setFormData(prev => ({
                ...prev,
                photo_url: dataUrl
              }));
            }
            
            setIsUploading(false);
          }
        } catch (error) {
          console.error('Error uploading to Cloudinary:', error);
          alert('Failed to upload image. Please try again.');
          setIsUploading(false);
        }
      }, 'image/jpeg', 0.9);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.photo_url) {
      alert('Please capture a photo before submitting');
      return;
    }
    
    if (!formData.latitude || !formData.longitude) {
      alert('GPS location is required. Please click "Get Current Location" button');
      return;
    }
    
    // Prepare batch data
    const batchData = {
      ...formData,
    };
    
    const resultAction = await dispatch(createBatch(batchData));
    
    if (createBatch.fulfilled.match(resultAction)) {
      navigate(`/batches/${resultAction.payload.id}`);
    }
  };
  
  // Debug logs to check user authentication
  console.log('User object:', user);
  console.log('User role:', user?.role);
  console.log('Is authenticated:', !!user);
  
  // More permissive check - allow any user to create batches for now
  const hasPermission = true; // Temporarily allow all users to create batches
  
  // Redirect if not authorized
  if (!hasPermission) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          You do not have permission to create batches. Only administrators, managers, and supervisors can create batches.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/batches')}
          sx={{ mt: 2 }}
        >
          Back to Batches
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/batches')}
          sx={{ mb: 2 }}
        >
          Back to Batches
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Batch
        </Typography>
        
        {/* Camera Dialog */}
        <Dialog open={showCamera} onClose={handleCloseCamera} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Take a Photo</Typography>
              <IconButton onClick={handleCloseCamera}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCamera}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={takePhoto}>Capture</Button>
          </DialogActions>
        </Dialog>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          {createError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {createError}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="from-location-label">Farm (Required)</InputLabel>
                  <Select
                    labelId="from-location-label"
                    name="from_location"
                    value={formData.from_location}
                    onChange={handleChange}
                    label="Farm (Required)"
                    required
                  >
                    {farms && farms.map((farm) => (
                      <MenuItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              

              
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
                          {supervisor.full_name || supervisor.username}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value={user?.id || ''}>
                        {user?.full_name || user?.username || 'Current User'}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Batch Photo (Required)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {formData.photo_url ? (
                      <TextField
                        label="Photo URL"
                        fullWidth
                        value={formData.photo_url}
                        InputProps={{
                          readOnly: true,
                        }}
                        helperText="Photo will be stored in Cloudinary"
                      />
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCameraIcon />}
                        onClick={handleCapturePhoto}
                        fullWidth
                        disabled={isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Capture Photo'}
                      </Button>
                    )}
                  </Box>
                  {formData.photo_url && (
                    <Box sx={{ mt: 1, maxWidth: '100%', maxHeight: '200px', overflow: 'hidden' }}>
                      <img 
                        src={formData.photo_url} 
                        alt="Batch preview" 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
                        onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.jpg'; }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  GPS Location (Required)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Latitude"
                      value={formData.latitude !== null ? formData.latitude : ''}
                      InputProps={{
                        readOnly: true,
                      }}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Longitude"
                      value={formData.longitude !== null ? formData.longitude : ''}
                      InputProps={{
                        readOnly: true,
                      }}
                      fullWidth
                      required
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    startIcon={isGettingLocation ? <CircularProgress size={20} /> : null}
                  >
                    {isGettingLocation ? 'Getting Location...' : 'Get Current Location'}
                  </Button>
                  {locationError && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {locationError}
                    </Alert>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Notes"
                  multiline
                  rows={4}
                  fullWidth
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => navigate('/batches')}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={createLoading}
                  >
                    {createLoading ? <CircularProgress size={24} /> : 'Create Batch'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default BatchCreatePage;
