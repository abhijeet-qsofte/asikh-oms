import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Grid,
  Divider,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Scale as ScaleIcon,
  LocalShipping as BatchIcon,
  Agriculture as FarmIcon,
  Category as VarietyIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { uploadImage, optimizeImage } from '../../services/cloudinaryService';

/**
 * CrateCard component for displaying crate information in a card format
 * with collapsible details, QR code display, and edit functionality
 */
const CrateCard = ({ crate, varieties, farms, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editedCrate, setEditedCrate] = useState({ ...crate });
  
  // Camera and photo state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front camera
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Handle card expansion toggle
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  // Handle edit mode toggle
  const handleEditClick = () => {
    setEditing(true);
    setEditedCrate({ ...crate });
    // Reset photo state
    setCapturedImage(null);
    setCloudinaryUrl('');
    // Automatically expand the card to show the edit form
    setExpanded(true);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditing(false);
    setEditedCrate({ ...crate });
    // Reset photo state
    setCapturedImage(null);
    setCloudinaryUrl('');
    stopCamera();
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      // If we have a captured image, upload it to Cloudinary first
      let imageUrl = null;
      if (capturedImage) {
        console.log("Uploading image to Cloudinary...");
        imageUrl = await handleImageUpload();
      }
      
      // Create a copy of the edited crate
      const updatedCrate = { ...editedCrate };
      
      // Add the image URL if available
      if (imageUrl) {
        updatedCrate.image_url = imageUrl;
      }
      
      if (onUpdate) {
        // Pass the ID and the edited crate data separately to match the expected format
        onUpdate({
          id: updatedCrate.id,
          crateData: updatedCrate
        });
        
        console.log('Saving edited crate:', updatedCrate);
      }
      setEditing(false);
    } catch (error) {
      console.error('Error saving crate:', error);
    }
  };
  
  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(crate.id);
    }
  };
  
  // Handle QR code dialog
  const handleQrDialogOpen = () => {
    setQrDialogOpen(true);
  };
  
  const handleQrDialogClose = () => {
    setQrDialogOpen(false);
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Convert numeric fields to numbers
    const processedValue = type === 'number' && value !== '' ? 
      parseFloat(value) : 
      value;
      
    setEditedCrate({
      ...editedCrate,
      [name]: processedValue,
    });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  // Get variety name by ID
  const getVarietyName = (varietyId) => {
    if (!varietyId || !varieties) return 'N/A';
    const variety = varieties.find(v => v.id === varietyId);
    return variety ? variety.name : 'Unknown';
  };
  
  // Get farm name by ID
  const getFarmName = (farmId) => {
    if (!farmId || !farms) return 'N/A';
    const farm = farms.find(f => f.id === farmId);
    return farm ? farm.name : 'Unknown';
  };
  
  // Camera functions
  const openCamera = async () => {
    setCameraOpen(true);
    try {
      await startCamera();
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraOpen(false);
    }
  };
  
  // Start camera with current facing mode
  const startCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      return true;
    } catch (err) {
      console.error("Error starting camera:", err);
      return false;
    }
  };
  
  // Toggle between front and back cameras
  const toggleCamera = async () => {
    // Switch facing mode
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    // Restart camera with new facing mode
    await startCamera();
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

    console.log("Photo captured successfully");
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
      
      console.log("Image uploaded successfully");
      
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Render camera dialog
  const renderCameraDialog = () => (
    <Dialog
      open={cameraOpen}
      onClose={closeCamera}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Take Photo</Typography>
          <IconButton onClick={closeCamera}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', maxHeight: '70vh', borderRadius: '8px' }}
          />
          <canvas ref={photoRef} style={{ display: 'none' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeCamera}>Cancel</Button>
        <Button
          variant="outlined"
          onClick={toggleCamera}
          sx={{ mr: 1 }}
        >
          {facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Back Camera'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={takePhoto}
          startIcon={<PhotoCameraIcon />}
        >
          Capture
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'success';
      case 'assigned':
        return 'primary';
      case 'reconciled':
        return 'info';
      case 'damaged':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Render QR code dialog
  const renderQrDialog = () => (
    <Dialog open={qrDialogOpen} onClose={handleQrDialogClose}>
      <DialogTitle>QR Code: {crate.qr_code}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" p={2}>
          <QRCodeSVG 
            value={crate.qr_code} 
            size={200} 
            level="H" 
            includeMargin={true}
          />
          <Typography variant="body1" mt={2}>
            {crate.qr_code}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleQrDialogClose}>Close</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => {
            // Create a downloadable link for the QR code
            const svgElement = document.querySelector("svg");
            
            if (svgElement) {
              // Get the SVG data
              const svgData = new XMLSerializer().serializeToString(svgElement);
              const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
              const svgUrl = URL.createObjectURL(svgBlob);
              
              const downloadLink = document.createElement("a");
              downloadLink.href = svgUrl;
              downloadLink.download = `qrcode-${crate.qr_code}.svg`;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(svgUrl);
            } else {
              console.error('SVG element not found');
            }
          }}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <>
      <Card 
        elevation={2} 
        sx={{ 
          mb: 2,
          borderLeft: 4,
          borderColor: getStatusColor(crate.status),
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          },
          cursor: 'pointer', // Add cursor pointer to indicate clickable
        }}
      >
        <CardContent 
          sx={{ pb: 1 }} 
          onClick={handleExpandClick} // Add click handler to toggle expansion
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="div">
                {crate.qr_code}
              </Typography>
            </Box>
            
            <Chip 
              label={crate.status || 'Unknown'} 
              color={getStatusColor(crate.status)}
              size="small"
            />
          </Box>
          
          <Box mt={1} display="flex" alignItems="center">
            <VarietyIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {getVarietyName(crate.variety_id)}
            </Typography>
          </Box>
          
          <Box mt={0.5} display="flex" alignItems="center">
            <ScaleIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {crate.weight ? `${crate.weight.toFixed(1)} kg` : 'N/A'}
            </Typography>
          </Box>
          
          {crate.batch_id && (
            <Box mt={0.5} display="flex" alignItems="center">
              <BatchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Batch #{crate.batch_id}
              </Typography>
            </Box>
          )}
        </CardContent>
        
        <CardActions disableSpacing sx={{ pt: 0 }}>
          <IconButton onClick={handleQrDialogOpen} size="small" title="View QR Code">
            <QrCodeIcon fontSize="small" />
          </IconButton>
          
          <IconButton onClick={handleEditClick} size="small" title="Edit Crate" disabled={editing}>
            <EditIcon fontSize="small" />
          </IconButton>
          
          <IconButton onClick={handleDelete} size="small" title="Delete Crate" disabled={editing}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          
          <Box flexGrow={1} />
          
          <IconButton
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </CardActions>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />
          <CardContent>
            {editing ? (
              // Edit form
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="QR Code"
                    name="qr_code"
                    value={editedCrate.qr_code || ''}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                    disabled // QR code should not be editable
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weight (kg)"
                    name="weight"
                    type="number"
                    value={editedCrate.weight || ''}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Variety</InputLabel>
                    <Select
                      name="variety_id"
                      value={editedCrate.variety_id || ''}
                      onChange={handleChange}
                      label="Variety"
                    >
                      {varieties?.map(variety => (
                        <MenuItem key={variety.id} value={variety.id}>
                          {variety.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Farm</InputLabel>
                    <Select
                      name="farm_id"
                      value={editedCrate.farm_id || ''}
                      onChange={handleChange}
                      label="Farm"
                    >
                      {farms?.map(farm => (
                        <MenuItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={editedCrate.status || ''}
                      onChange={handleChange}
                      label="Status"
                    >
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="assigned">Assigned</MenuItem>
                      <MenuItem value="reconciled">Reconciled</MenuItem>
                      <MenuItem value="damaged">Damaged</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Photo upload section */}
                <Grid item xs={12}>
                  <Box mt={2} mb={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Crate Photo
                    </Typography>
                    
                    <Box display="flex" alignItems="center" mb={2}>
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCameraIcon />}
                        onClick={openCamera}
                        sx={{ mr: 2 }}
                        disabled={isUploading}
                      >
                        Take Photo
                      </Button>
                      
                      {isUploading && (
                        <Box sx={{ width: '100%', ml: 2 }}>
                          <LinearProgress variant="determinate" value={uploadProgress} />
                          <Typography variant="caption">
                            Uploading... {uploadProgress}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {(capturedImage || cloudinaryUrl || editedCrate.image_url) && (
                      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" flexDirection="column" alignItems="center">
                          <img
                            src={cloudinaryUrl || capturedImage || editedCrate.image_url}
                            alt="Crate"
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '200px', 
                              borderRadius: '4px',
                              marginBottom: '8px'
                            }}
                          />
                          
                          {cloudinaryUrl && (
                            <Typography variant="caption" color="success.main">
                              Image uploaded to Cloudinary
                            </Typography>
                          )}
                          
                          {capturedImage && !cloudinaryUrl && (
                            <Typography variant="caption">
                              Photo will be uploaded when you save
                            </Typography>
                          )}
                          
                          {editedCrate.image_url && !capturedImage && !cloudinaryUrl && (
                            <Typography variant="caption">
                              Current image
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    name="notes"
                    value={editedCrate.notes || ''}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                    multiline
                    rows={2}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" mt={1}>
                    <Button 
                      startIcon={<CancelIcon />}
                      onClick={handleCancelEdit} 
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              // Detail view
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    QR Code:
                  </Typography>
                  <Typography variant="body1">
                    {crate.qr_code}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Weight:
                  </Typography>
                  <Typography variant="body1">
                    {crate.weight ? `${crate.weight.toFixed(1)} kg` : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Variety:
                  </Typography>
                  <Typography variant="body1">
                    {getVarietyName(crate.variety_id)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Farm:
                  </Typography>
                  <Typography variant="body1">
                    {getFarmName(crate.farm_id)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body1">
                    {crate.status || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(crate.created_at)}
                  </Typography>
                </Grid>
                
                {crate.batch_id && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Batch:
                    </Typography>
                    <Typography variant="body1">
                      #{crate.batch_id}
                    </Typography>
                  </Grid>
                )}
                
                {crate.reconciled_at && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Reconciled:
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(crate.reconciled_at)}
                    </Typography>
                  </Grid>
                )}
                
                {crate.reconciled_weight && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Reconciled Weight:
                    </Typography>
                    <Typography variant="body1">
                      {crate.reconciled_weight.toFixed(1)} kg
                    </Typography>
                  </Grid>
                )}
                
                {crate.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Notes:
                    </Typography>
                    <Typography variant="body1">
                      {crate.notes}
                    </Typography>
                  </Grid>
                )}
                
                {/* Display crate image if available */}
                {crate.image_url && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Photo:
                    </Typography>
                    <Box mt={1} display="flex" justifyContent="center">
                      <img
                        src={crate.image_url}
                        alt="Crate"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '200px', 
                          borderRadius: '4px' 
                        }}
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Collapse>
      </Card>
      
      {/* QR Code Dialog */}
      {renderQrDialog()}
      
      {/* Camera Dialog */}
      {renderCameraDialog()}
    </>
  );
};

export default CrateCard;
