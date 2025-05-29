import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as BatchIcon,
} from '@mui/icons-material';
import CrateReconciliationForm from './components/CrateReconciliationForm';
import batchService from '../../services/batchService';
import reconciliationService from '../../services/reconciliationService';

/**
 * Page for scanning and reconciling crates in a batch
 */
const ReconciliationScanPage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState(null);
  const [reconciliationStats, setReconciliationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Load batch details and reconciliation stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch batch details
        const batchData = await batchService.getBatchById(batchId);
        setBatch(batchData);
        
        // Fetch reconciliation stats
        const statsData = await reconciliationService.getReconciliationStats(batchId);
        setReconciliationStats(statsData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching batch data:', error);
        setError(`Failed to load batch data: ${error.message || 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [batchId]);
  
  // Refresh reconciliation stats after successful reconciliation
  const handleReconcileSuccess = async () => {
    try {
      setSuccess('Crate successfully reconciled!');
      
      // Refresh reconciliation stats
      const statsData = await reconciliationService.getReconciliationStats(batchId);
      setReconciliationStats(statsData);
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error refreshing reconciliation stats:', error);
    }
  };
  
  // Navigate back to reconciliation detail page
  const handleBack = () => {
    navigate(`/reconciliation/${batchId}`);
  };
  
  // Calculate reconciliation progress percentage
  const getReconciliationPercentage = () => {
    if (!reconciliationStats) return 0;
    
    const { reconciled_crates, total_crates } = reconciliationStats;
    if (!total_crates) return 0;
    
    return Math.round((reconciled_crates / total_crates) * 100);
  };
  
  // Get color based on reconciliation progress
  const getProgressColor = () => {
    const percentage = getReconciliationPercentage();
    
    if (percentage === 100) return 'success.main';
    if (percentage >= 50) return 'warning.main';
    return 'error.main';
  };
  
  // Check if all crates are reconciled
  const isReconciliationComplete = () => {
    if (!reconciliationStats) return false;
    
    const { reconciled_crates, total_crates } = reconciliationStats;
    return reconciled_crates === total_crates && total_crates > 0;
  };
  
  // Render loading state
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box my={4}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back to Reconciliation
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <QrCodeIcon sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Scan & Reconcile Crates
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back to Batch
          </Button>
        </Box>
        
        {/* Success message */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}
        
        {/* Batch summary */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" mb={1}>
                  <BatchIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Batch #{batch?.id || batchId}
                  </Typography>
                  
                  <Chip
                    label={batch?.status || 'Unknown'}
                    color={batch?.status === 'ARRIVED' ? 'success' : 'default'}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {batch?.notes || 'No batch notes available'}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      From:
                    </Typography>
                    <Typography variant="body1">
                      {batch?.farm?.name || batch?.from_location_name || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      To:
                    </Typography>
                    <Typography variant="body1">
                      {batch?.packhouse?.name || batch?.to_location_name || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'background.paper', 
                    border: 1, 
                    borderColor: getProgressColor(),
                    borderRadius: 1
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Reconciliation Progress
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box
                      sx={{
                        width: '100%',
                        height: 10,
                        bgcolor: 'grey.200',
                        borderRadius: 5,
                        mr: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: `${getReconciliationPercentage()}%`,
                          height: '100%',
                          bgcolor: getProgressColor(),
                          borderRadius: 5,
                          transition: 'width 0.5s ease-in-out',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="medium">
                      {getReconciliationPercentage()}%
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'medium',
                      color: getProgressColor(),
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {reconciliationStats?.reconciled_crates || 0}/{reconciliationStats?.total_crates || 0}
                    {isReconciliationComplete() && (
                      <CheckCircleIcon sx={{ ml: 1, color: 'success.main' }} />
                    )}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    crates reconciled
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Reconciliation form */}
        <CrateReconciliationForm
          batchId={batchId}
          onReconcileSuccess={handleReconcileSuccess}
          onCancel={handleBack}
        />
      </Box>
    </Container>
  );
};

export default ReconciliationScanPage;
