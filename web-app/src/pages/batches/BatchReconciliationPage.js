import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCode as QrCodeIcon,
  PhotoCamera as PhotoCameraIcon,
  Scale as ScaleIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import QRScanner from '../../components/qrcode/QRScanner';
import PhotoCapture from '../../components/camera/PhotoCapture';
import CrateReconciliationForm from '../reconciliation/components/CrateReconciliationForm';
import batchService from '../../services/batchService';
import reconciliationService from '../../services/reconciliationService';
import crateService from '../../services/crateService';
import { uploadImage } from '../../services/cloudinaryService';

/**
 * BatchReconciliationPage component for reconciling crates in a batch
 * This page guides users through the reconciliation process with a step-by-step interface
 */
const BatchReconciliationPage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  
  // State for batch data
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for reconciliation process
  const [activeStep, setActiveStep] = useState(0);
  const [scannedCrate, setScannedCrate] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [weight, setWeight] = useState('');
  const [scanning, setScanning] = useState(false);
  const [processingReconciliation, setProcessingReconciliation] = useState(false);
  const [reconciliationStats, setReconciliationStats] = useState(null);
  const [completingBatch, setCompletingBatch] = useState(false);
  
  // Steps for the reconciliation process
  const steps = ['Scan QR Code', 'Capture Photo', 'Enter Weight', 'Confirm'];
  
  // Fetch batch data and reconciliation stats
  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        setLoading(true);
        const batchData = await batchService.getBatchById(batchId);
        setBatch(batchData);
        
        // Get reconciliation stats
        const stats = await reconciliationService.getReconciliationStats(batchId);
        setReconciliationStats(stats);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching batch data:', err);
        setError('Failed to load batch data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchBatchData();
  }, [batchId]);
  
  // Handle QR code scanning
  const handleQrScanned = async (qrCode) => {
    try {
      setScanning(true);
      
      // Get crate data from QR code
      const crateData = await crateService.getCrateByQR(qrCode);
      
      // Check if crate is already reconciled
      if (crateData.status === 'RECONCILED') {
        setError('This crate has already been reconciled.');
        setScanning(false);
        return;
      }
      
      // Check if crate belongs to this batch
      if (crateData.batch_id !== parseInt(batchId)) {
        setError(`This crate belongs to batch #${crateData.batch_id}, not the current batch #${batchId}.`);
        setScanning(false);
        return;
      }
      
      setScannedCrate(crateData);
      setScanning(false);
      handleNext();
    } catch (err) {
      console.error('Error scanning QR code:', err);
      setError('Failed to scan QR code. Please try again.');
      setScanning(false);
    }
  };
  
  // Handle photo capture
  const handlePhotoCapture = (photoData) => {
    setCapturedPhoto(photoData);
    handleNext();
  };
  
  // Handle weight input
  const handleWeightChange = (e) => {
    setWeight(e.target.value);
  };
  
  // Handle weight submission
  const handleWeightSubmit = () => {
    if (!weight || isNaN(parseFloat(weight))) {
      setError('Please enter a valid weight.');
      return;
    }
    
    handleNext();
  };
  
  // Handle reconciliation confirmation
  const handleReconcileConfirm = async () => {
    try {
      setProcessingReconciliation(true);
      
      // Upload photo if captured
      let uploadedPhotoUrl = null;
      if (capturedPhoto) {
        uploadedPhotoUrl = await uploadImage(capturedPhoto);
        setPhotoUrl(uploadedPhotoUrl);
      }
      
      // Submit reconciliation data
      await reconciliationService.reconcileCrate(
        batchId,
        scannedCrate.qr_code,
        parseFloat(weight),
        uploadedPhotoUrl
      );
      
      // Update reconciliation stats
      const updatedStats = await reconciliationService.getReconciliationStats(batchId);
      setReconciliationStats(updatedStats);
      
      // Reset form for next crate
      setScannedCrate(null);
      setCapturedPhoto(null);
      setPhotoUrl(null);
      setWeight('');
      setActiveStep(0);
      setProcessingReconciliation(false);
    } catch (err) {
      console.error('Error reconciling crate:', err);
      setError('Failed to reconcile crate. Please try again.');
      setProcessingReconciliation(false);
    }
  };
  
  // Handle completing batch reconciliation
  const handleCompleteBatch = async () => {
    try {
      setCompletingBatch(true);
      
      // Complete batch reconciliation
      await reconciliationService.completeBatchReconciliation(batchId);
      
      // Update batch status
      await batchService.updateBatch(batchId, { status: 'RECONCILED' });
      
      // Navigate back to batch details
      navigate(`/batches/${batchId}`);
    } catch (err) {
      console.error('Error completing batch reconciliation:', err);
      setError('Failed to complete batch reconciliation. Please try again.');
      setCompletingBatch(false);
    }
  };
  
  // Handle navigation between steps
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Calculate reconciliation progress
  const calculateProgress = () => {
    if (!reconciliationStats) return 0;
    
    const { total_crates, reconciled_crates } = reconciliationStats;
    if (total_crates === 0) return 0;
    
    return (reconciled_crates / total_crates) * 100;
  };
  
  // Render step content based on active step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QrCodeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Scan Crate QR Code
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Position the QR code within the scanner frame
            </Typography>
            
            {scanning ? (
              <CircularProgress />
            ) : (
              <Box sx={{ width: '100%', maxWidth: 500 }}>
                <QRScanner onScan={handleQrScanned} />
              </Box>
            )}
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PhotoCameraIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Capture Photo (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Take a photo of the crate or skip this step
            </Typography>
            
            <Box sx={{ width: '100%', maxWidth: 500 }}>
              <PhotoCapture onCapture={handlePhotoCapture} />
            </Box>
            
            <Button 
              variant="text" 
              onClick={handleNext} 
              sx={{ mt: 2 }}
            >
              Skip Photo
            </Button>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ScaleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Enter Crate Weight
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Enter the weight of the crate in kilograms
            </Typography>
            
            <Box sx={{ width: '100%', maxWidth: 300 }}>
              <CrateReconciliationForm
                weight={weight}
                onWeightChange={handleWeightChange}
                onSubmit={handleWeightSubmit}
              />
            </Box>
          </Box>
        );
        
      case 3:
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Confirm Reconciliation
            </Typography>
            
            <Card sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      QR Code
                    </Typography>
                    <Typography variant="body1">
                      {scannedCrate?.qr_code}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Expected Weight
                    </Typography>
                    <Typography variant="body1">
                      {scannedCrate?.expected_weight ? `${scannedCrate.expected_weight} kg` : 'N/A'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Actual Weight
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {weight} kg
                    </Typography>
                  </Grid>
                  
                  {capturedPhoto && (
                    <>
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Photo
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <img 
                            src={URL.createObjectURL(capturedPhoto)} 
                            alt="Crate" 
                            style={{ width: '100%', borderRadius: 4 }}
                          />
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={processingReconciliation}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleReconcileConfirm}
                disabled={processingReconciliation}
                startIcon={processingReconciliation ? <CircularProgress size={20} /> : <CheckIcon />}
              >
                {processingReconciliation ? 'Processing...' : 'Confirm Reconciliation'}
              </Button>
            </Box>
          </Box>
        );
        
      default:
        return 'Unknown step';
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
          <Button 
            variant="text" 
            color="inherit" 
            onClick={() => setError(null)} 
            sx={{ ml: 2 }}
          >
            Dismiss
          </Button>
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            edge="start" 
            onClick={() => navigate(`/batches/${batchId}`)} 
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Batch Reconciliation
          </Typography>
        </Box>
        
        <Typography variant="subtitle1" color="text.secondary">
          Batch #{batch?.id} - {batch?.farm?.name || 'Unknown Farm'}
        </Typography>
      </Box>
      
      {/* Reconciliation Progress */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Reconciliation Progress</Typography>
          <Chip 
            label={`${reconciliationStats?.reconciled_crates || 0} of ${reconciliationStats?.total_crates || 0} Crates`}
            color="primary"
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress()} 
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {calculateProgress().toFixed(0)}% Complete
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reconciliationStats?.remaining_crates || 0} Crates Remaining
          </Typography>
        </Box>
      </Paper>
      
      {/* Reconciliation Process */}
      <Paper sx={{ mb: 4 }}>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ p: 3, pb: 0 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Step Content */}
        <Box sx={{ p: 3 }}>
          {getStepContent(activeStep)}
        </Box>
      </Paper>
      
      {/* Complete Batch Button */}
      {reconciliationStats?.reconciled_crates > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={completingBatch ? <CircularProgress size={20} color="inherit" /> : <AssignmentIcon />}
            onClick={handleCompleteBatch}
            disabled={
              completingBatch || 
              reconciliationStats?.reconciled_crates !== reconciliationStats?.total_crates
            }
          >
            {completingBatch
              ? 'Completing...'
              : reconciliationStats?.reconciled_crates === reconciliationStats?.total_crates
                ? 'Complete Batch Reconciliation'
                : 'All Crates Must Be Reconciled'}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default BatchReconciliationPage;
