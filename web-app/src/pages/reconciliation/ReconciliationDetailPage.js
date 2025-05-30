import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCodeScanner as QrCodeScannerIcon,
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  getReconciliationStatus, 
  reconcileCrate, 
  closeBatch 
} from '../../store/slices/reconciliationSlice';
import CrateReconciliationCard from '../../components/reconciliation/CrateReconciliationCard';
import BatchInfoCard from '../../components/reconciliation/BatchInfoCard';
import ReconciliationStats from '../../components/reconciliation/ReconciliationStats';
import ManualEntryDialog from '../../components/reconciliation/ManualEntryDialog';

const ReconciliationDetailPage = () => {
  const { id: batchId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { status, batch, loading, error, reconciliationInProgress, closingBatch } = useSelector(
    (state) => state.reconciliation
  );
  
  // Local state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [selectedCrate, setSelectedCrate] = useState(null);
  const [weight, setWeight] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Fetch reconciliation status on mount
  useEffect(() => {
    dispatch(getReconciliationStatus(batchId));
    
    // Cleanup function
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [dispatch, batchId]);
  
  // Initialize QR scanner when scanner dialog is opened
  useEffect(() => {
    if (scannerOpen) {
      // Small delay to ensure DOM is ready
      const timerId = setTimeout(() => {
        const qrScanner = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: 250 },
          false
        );
        
        qrScanner.render(onScanSuccess, onScanError);
        scannerRef.current = qrScanner;
      }, 100);
      
      return () => {
        clearTimeout(timerId);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      };
    }
  }, [scannerOpen]);
  
  // Handle successful QR scan
  const onScanSuccess = (decodedText) => {
    // Close scanner
    setScannerOpen(false);
    
    // Find crate by QR code
    const crate = batch?.crates.find((c) => c.qr_code === decodedText);
    
    if (crate) {
      if (crate.reconciled) {
        alert(`Crate ${decodedText} has already been reconciled.`);
      } else {
        // Select crate and move to next step
        setSelectedCrate(crate);
        setActiveStep(1);
      }
    } else {
      alert(`Crate ${decodedText} not found in this batch.`);
    }
  };
  
  // Handle QR scan error
  const onScanError = (error) => {
    console.error('QR scan error:', error);
  };
  
  // Handle manual QR code entry
  const handleManualEntry = (qrCode) => {
    setManualEntryOpen(false);
    
    // Find crate by QR code
    const crate = batch?.crates.find((c) => c.qr_code === qrCode);
    
    if (crate) {
      if (crate.reconciled) {
        alert(`Crate ${qrCode} has already been reconciled.`);
      } else {
        // Select crate and move to next step
        setSelectedCrate(crate);
        setActiveStep(1);
      }
    } else {
      alert(`Crate ${qrCode} not found in this batch.`);
    }
  };
  
  // Handle photo capture
  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      
      // Move to next step
      setActiveStep(2);
    }
  };
  
  // Handle weight change
  const handleWeightChange = (e) => {
    setWeight(e.target.value);
  };
  
  // Handle reconciliation submission
  const handleSubmit = async () => {
    if (!selectedCrate || !weight) {
      alert('Please enter a weight for the crate.');
      return;
    }
    
    // Convert weight to number
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      alert('Please enter a valid weight.');
      return;
    }
    
    // Dispatch reconcile action
    const resultAction = await dispatch(
      reconcileCrate({
        batchId,
        crateId: selectedCrate.id,
        weight: weightValue,
        photoFile: photo,
      })
    );
    
    if (reconcileCrate.fulfilled.match(resultAction)) {
      // Reset state for next reconciliation
      setSelectedCrate(null);
      setWeight('');
      setPhoto(null);
      setPhotoPreview(null);
      setActiveStep(0);
      
      // Refresh reconciliation status
      dispatch(getReconciliationStatus(batchId));
    }
  };
  
  // Handle batch close
  const handleCloseBatch = async () => {
    const resultAction = await dispatch(closeBatch(batchId));
    
    if (closeBatch.fulfilled.match(resultAction)) {
      setConfirmCloseOpen(false);
      // Navigate back to batches page
      navigate('/batches');
    }
  };
  
  // Check if all crates are reconciled
  const allCratesReconciled = status?.reconciled_crates === status?.total_crates;
  
  // Reconciliation steps
  const steps = [
    { label: 'Scan QR Code', description: 'Scan the QR code on the crate' },
    { label: 'Take Photo', description: 'Take a photo of the crate' },
    { label: 'Enter Weight', description: 'Enter the weight of the crate' },
  ];
  
  if (loading && !batch) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !batch) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reconciliation')}
            sx={{ mt: 2 }}
          >
            Back to Reconciliation
          </Button>
        </Box>
      </Container>
    );
  }
  
  if (!batch) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">Batch not found</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reconciliation')}
            sx={{ mt: 2 }}
          >
            Back to Reconciliation
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reconciliation')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Reconcile Batch #{batch.batch_code || batch.id}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<QrCodeScannerIcon />}
            onClick={() => navigate(`/reconciliation/${batchId}/scan`)}
            sx={{ ml: 2 }}
          >
            Scan & Reconcile
          </Button>
        </Box>
      </Box>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Batch Info and Stats */}
        <Grid item xs={12} md={4}>
          <BatchInfoCard batch={batch} />
          
          <Box sx={{ mt: 3 }}>
            <ReconciliationStats 
              reconciled={status?.reconciled_crates || 0}
              total={status?.total_crates || 0}
              originalWeight={batch.total_weight || 0}
              reconciledWeight={status?.reconciled_weight || 0}
            />
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setScannerOpen(true)}
              disabled={reconciliationInProgress || activeStep > 0}
              sx={{ mb: 2 }}
            >
              Scan QR Code
            </Button>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setManualEntryOpen(true)}
              disabled={reconciliationInProgress || activeStep > 0}
              sx={{ mb: 2 }}
            >
              Manual Entry
            </Button>
            
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<CheckCircleIcon />}
              onClick={() => setConfirmCloseOpen(true)}
              disabled={!allCratesReconciled || closingBatch}
            >
              {closingBatch ? <CircularProgress size={24} /> : 'Close Batch'}
            </Button>
          </Box>
        </Grid>
        
        {/* Right Column - Reconciliation Process */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reconciliation Process
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {/* Stepper */}
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              {/* Step Content */}
              <Box sx={{ mt: 2, mb: 4 }}>
                {activeStep === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <QrCodeScannerIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Scan Crate QR Code
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Click the "Scan QR Code" button to start scanning, or use manual entry if the QR code is damaged.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<QrCodeScannerIcon />}
                        onClick={() => setScannerOpen(true)}
                      >
                        Scan QR Code
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setManualEntryOpen(true)}
                      >
                        Manual Entry
                      </Button>
                    </Box>
                  </Box>
                ) : activeStep === 1 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <PhotoCameraIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Take Photo of Crate
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Take a clear photo of the crate to document its condition.
                    </Typography>
                    
                    {selectedCrate && (
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Selected Crate: {selectedCrate.qr_code}
                        </Typography>
                        <Typography variant="body2">
                          Original Weight: {selectedCrate.weight ? `${selectedCrate.weight.toFixed(1)} kg` : 'N/A'}
                        </Typography>
                      </Box>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCapture}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<PhotoCameraIcon />}
                        onClick={() => fileInputRef.current.click()}
                      >
                        Take Photo
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                          setSelectedCrate(null);
                          setActiveStep(0);
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ py: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Enter Crate Weight
                    </Typography>
                    
                    {selectedCrate && (
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Selected Crate: {selectedCrate.qr_code}
                        </Typography>
                        <Typography variant="body2">
                          Original Weight: {selectedCrate.weight ? `${selectedCrate.weight.toFixed(1)} kg` : 'N/A'}
                        </Typography>
                      </Box>
                    )}
                    
                    {photoPreview && (
                      <Box sx={{ mb: 3, textAlign: 'center' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Photo Preview:
                        </Typography>
                        <img
                          src={photoPreview}
                          alt="Crate"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '8px',
                          }}
                        />
                      </Box>
                    )}
                    
                    <TextField
                      label="Crate Weight (kg)"
                      type="number"
                      value={weight}
                      onChange={handleWeightChange}
                      fullWidth
                      sx={{ mb: 3 }}
                      InputProps={{
                        endAdornment: <Typography variant="body2">kg</Typography>,
                      }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                          setPhoto(null);
                          setPhotoPreview(null);
                          setActiveStep(1);
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={handleSubmit}
                        disabled={!weight || reconciliationInProgress}
                      >
                        {reconciliationInProgress ? <CircularProgress size={24} /> : 'Save'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* Reconciliation Progress */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Reconciliation Progress
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(status?.reconciled_crates / status?.total_crates) * 100 || 0}
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                  {status?.reconciled_crates || 0} of {status?.total_crates || 0} crates reconciled
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          {/* Crates List */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Crates
            </Typography>
            
            <Grid container spacing={2}>
              {batch.crates && batch.crates.map((crate) => (
                <Grid item xs={12} sm={6} key={crate.id}>
                  <CrateReconciliationCard
                    crate={crate}
                    onSelect={() => {
                      if (!crate.reconciled) {
                        setSelectedCrate(crate);
                        setActiveStep(1);
                      }
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Grid>
      
      {/* QR Scanner Dialog */}
      <Dialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Scan QR Code</Typography>
            <IconButton onClick={() => setScannerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center' }}>
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Position the QR code within the scanner area.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Manual Entry Dialog */}
      <ManualEntryDialog
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        onSubmit={handleManualEntry}
      />
      
      {/* Confirm Close Dialog */}
      <Dialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
      >
        <DialogTitle>Close Batch</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to close this batch? This action cannot be undone.
          </Typography>
          {!allCratesReconciled && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Not all crates have been reconciled. It's recommended to reconcile all crates before closing the batch.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCloseOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCloseBatch}
            color="primary"
            variant="contained"
            disabled={closingBatch}
          >
            {closingBatch ? <CircularProgress size={24} /> : 'Close Batch'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReconciliationDetailPage;
