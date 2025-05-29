import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Paper,
  Grid,
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  CameraAlt as CameraIcon,
  Scale as ScaleIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import QRScanner from '../../../components/qrcode/QRScanner';
import PhotoCapture from '../../../components/camera/PhotoCapture';
import reconciliationService from '../../../services/reconciliationService';
import crateService from '../../../services/crateService';

/**
 * Component for reconciling a crate in a batch
 * Allows scanning QR codes, entering weights, and capturing photos
 */
const CrateReconciliationForm = ({ batchId, onReconcileSuccess, onCancel }) => {
  const [qrCode, setQrCode] = useState('');
  const [weight, setWeight] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [crateDetails, setCrateDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [step, setStep] = useState('qr'); // 'qr', 'weight', 'photo', 'confirm'
  
  // Handle QR code scan
  const handleQrScan = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate QR code
      const crateResponse = await crateService.getCrateByQR(data);
      
      // Check if crate exists and is in the current batch
      if (crateResponse) {
        setCrateDetails(crateResponse);
        setQrCode(data);
        setShowQrScanner(false);
        setStep('weight');
      } else {
        setError('Crate not found or not associated with this batch');
      }
    } catch (error) {
      console.error('Error validating QR code:', error);
      setError(`QR code validation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle photo capture
  const handlePhotoCapture = (photoData) => {
    setPhotoUrl(photoData.url);
    setShowPhotoCapture(false);
    setStep('confirm');
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate inputs
      if (!qrCode) {
        setError('QR code is required');
        setLoading(false);
        return;
      }
      
      if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
        setError('Valid weight is required');
        setLoading(false);
        return;
      }
      
      // Submit reconciliation data
      const reconciliationData = {
        qr_code: qrCode,
        weight: parseFloat(weight),
        photo_url: photoUrl || null,
      };
      
      const response = await reconciliationService.reconcileCrate(
        batchId,
        qrCode,
        parseFloat(weight),
        photoUrl
      );
      
      setSuccess(true);
      setLoading(false);
      
      // Call success callback
      if (onReconcileSuccess) {
        onReconcileSuccess(response);
      }
      
      // Reset form after a short delay
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('Error reconciling crate:', error);
      setError(`Reconciliation failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };
  
  // Reset the form
  const resetForm = () => {
    setQrCode('');
    setWeight('');
    setPhotoUrl('');
    setCrateDetails(null);
    setError(null);
    setSuccess(false);
    setStep('qr');
  };
  
  // Render QR scanner dialog
  const renderQrScannerDialog = () => (
    <Dialog
      open={showQrScanner}
      onClose={() => setShowQrScanner(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogContent>
        <QRScanner
          onScan={handleQrScan}
          onError={(err) => setError(err.message || 'QR scanning error')}
          onClose={() => setShowQrScanner(false)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowQrScanner(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
  
  // Render photo capture dialog
  const renderPhotoCaptureDialog = () => (
    <Dialog
      open={showPhotoCapture}
      onClose={() => setShowPhotoCapture(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogContent>
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onError={(err) => setError(err.message || 'Photo capture error')}
          onClose={() => setShowPhotoCapture(false)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowPhotoCapture(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
  
  // Render QR code step
  const renderQrStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 1: Scan Crate QR Code
      </Typography>
      
      <Box display="flex" alignItems="center" mb={2}>
        <TextField
          label="QR Code"
          variant="outlined"
          fullWidth
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          placeholder="Enter or scan QR code"
          disabled={loading}
          sx={{ mr: 2 }}
        />
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<QrCodeIcon />}
          onClick={() => setShowQrScanner(true)}
          disabled={loading}
        >
          Scan
        </Button>
      </Box>
      
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (qrCode) {
              handleQrScan(qrCode);
            } else {
              setError('Please enter or scan a QR code');
            }
          }}
          disabled={!qrCode || loading}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
  
  // Render weight input step
  const renderWeightStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 2: Enter Crate Weight
      </Typography>
      
      {crateDetails && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Crate Details
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                QR Code:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {crateDetails.qr_code || qrCode}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Original Weight:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {crateDetails.weight ? `${crateDetails.weight.toFixed(1)} kg` : 'N/A'}
              </Typography>
            </Grid>
            
            {crateDetails.variety && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Variety:
                </Typography>
                <Typography variant="body1">
                  {crateDetails.variety.name || 'N/A'}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
      
      <Box display="flex" alignItems="center" mb={2}>
        <TextField
          label="Weight (kg)"
          variant="outlined"
          fullWidth
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Enter crate weight in kg"
          disabled={loading}
          InputProps={{
            startAdornment: <ScaleIcon color="action" sx={{ mr: 1 }} />,
            inputProps: { min: 0, step: 0.1 }
          }}
        />
      </Box>
      
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          onClick={() => setStep('qr')}
          disabled={loading}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (weight && !isNaN(parseFloat(weight)) && parseFloat(weight) > 0) {
              setStep('photo');
            } else {
              setError('Please enter a valid weight');
            }
          }}
          disabled={!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0 || loading}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
  
  // Render photo capture step
  const renderPhotoStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 3: Take Photo of Crate (Optional)
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          border: '1px dashed #ccc',
          borderRadius: 1,
          p: 3,
          mb: 3,
          bgcolor: 'background.paper'
        }}
      >
        {photoUrl ? (
          <Box sx={{ width: '100%', maxWidth: 300, mb: 2 }}>
            <img 
              src={photoUrl} 
              alt="Crate" 
              style={{ width: '100%', borderRadius: 4 }} 
            />
          </Box>
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              p: 4
            }}
          >
            <CameraIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              No photo captured yet
            </Typography>
          </Box>
        )}
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<CameraIcon />}
          onClick={() => setShowPhotoCapture(true)}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {photoUrl ? 'Retake Photo' : 'Take Photo'}
        </Button>
      </Box>
      
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          onClick={() => setStep('weight')}
          disabled={loading}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={() => setStep('confirm')}
          disabled={loading}
        >
          {photoUrl ? 'Next' : 'Skip Photo'}
        </Button>
      </Box>
    </Box>
  );
  
  // Render confirmation step
  const renderConfirmStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 4: Confirm Reconciliation
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Reconciliation Summary
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              QR Code:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {qrCode}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Weight:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {parseFloat(weight).toFixed(1)} kg
            </Typography>
          </Grid>
          
          {crateDetails && crateDetails.weight && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Weight Differential:
              </Typography>
              <Typography 
                variant="body1" 
                fontWeight="medium"
                color={
                  crateDetails.weight - parseFloat(weight) > crateDetails.weight * 0.1 
                    ? 'error.main' 
                    : crateDetails.weight - parseFloat(weight) > crateDetails.weight * 0.05
                      ? 'warning.main'
                      : 'success.main'
                }
              >
                {(crateDetails.weight - parseFloat(weight)).toFixed(1)} kg 
                ({((crateDetails.weight - parseFloat(weight)) / crateDetails.weight * 100).toFixed(1)}%)
              </Typography>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Photo:
            </Typography>
            {photoUrl ? (
              <Box sx={{ width: '100%', maxWidth: 200, mt: 1 }}>
                <img 
                  src={photoUrl} 
                  alt="Crate" 
                  style={{ width: '100%', borderRadius: 4 }} 
                />
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No photo
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          onClick={() => setStep('photo')}
          disabled={loading}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Complete Reconciliation'}
        </Button>
      </Box>
    </Box>
  );
  
  // Render the current step
  const renderCurrentStep = () => {
    switch (step) {
      case 'qr':
        return renderQrStep();
      case 'weight':
        return renderWeightStep();
      case 'photo':
        return renderPhotoStep();
      case 'confirm':
        return renderConfirmStep();
      default:
        return renderQrStep();
    }
  };
  
  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h5" gutterBottom>
            Crate Reconciliation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reconcile a crate by scanning its QR code, entering its weight, and optionally taking a photo.
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </Box>
        
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Success message */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Crate successfully reconciled!
          </Alert>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        )}
        
        {/* Current step */}
        {!loading && !success && renderCurrentStep()}
        
        {/* QR Scanner Dialog */}
        {renderQrScannerDialog()}
        
        {/* Photo Capture Dialog */}
        {renderPhotoCaptureDialog()}
      </CardContent>
    </Card>
  );
};

export default CrateReconciliationForm;
