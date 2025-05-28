import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as LocalShippingIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  CompareArrows as ReconcileIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL, ENDPOINTS } from '../../constants/api';
import StatusStepper from '../../components/batches/StatusStepper';

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
  });
  
  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch batch details
        const batchResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}`);
        const batchData = batchResponse.data;
        
        // Fetch weight details
        const weightResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCH_WEIGHT_DETAILS(id)}`);
        const weightData = weightResponse.data;
        
        // Combine data
        const batchWithDetails = {
          ...batchData,
          weight_details: weightData,
        };
        
        setBatch(batchWithDetails);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError('Failed to load batch details');
        setLoading(false);
      }
    };
    
    fetchBatchDetails();
  }, [id]);
  
  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      
      // Update batch status
      const response = await axios.put(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}/status`, {
        status: newStatus,
      });
      
      // Update local state with new data
      setBatch(response.data);
      setLoading(false);
      setConfirmDialog({ open: false });
    } catch (error) {
      console.error(`Error updating batch status to ${newStatus}:`, error);
      setError(`Failed to update batch status to ${newStatus}`);
      setLoading(false);
      setConfirmDialog({ open: false });
    }
  };
  
  const openConfirmDialog = (title, message, action) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action,
    });
  };
  
  const closeConfirmDialog = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false,
    });
  };
  
  const handleDispatch = () => {
    openConfirmDialog(
      'Dispatch Batch',
      'Are you sure you want to mark this batch as dispatched? This will record the current time as the departure time.',
      () => handleStatusChange('DISPATCHED')
    );
  };
  
  const handleArrive = () => {
    openConfirmDialog(
      'Mark as Arrived',
      'Are you sure you want to mark this batch as arrived at the packhouse? This will record the current time as the arrival time.',
      () => handleStatusChange('ARRIVED')
    );
  };
  
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // Delete batch
      await axios.delete(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}`);
      
      // Navigate back to batches page
      navigate('/batches');
    } catch (error) {
      console.error('Error deleting batch:', error);
      setError('Failed to delete batch');
      setLoading(false);
      setConfirmDialog({ open: false });
    }
  };
  
  const confirmDelete = () => {
    openConfirmDialog(
      'Delete Batch',
      'Are you sure you want to delete this batch? This action cannot be undone.',
      handleDelete
    );
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  // Format status label for display
  const formatStatus = (status) => {
    if (status === 'ARRIVED') {
      return 'Arrived';
    }
    return status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown';
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'DISPATCHED':
        return 'info';
      case 'ARRIVED':
        return 'success';
      case 'RECONCILED':
        return 'primary';
      case 'CLOSED':
        return 'default';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/batches')}
            sx={{ mt: 2 }}
          >
            Back to Batches
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
            onClick={() => navigate('/batches')}
            sx={{ mt: 2 }}
          >
            Back to Batches
          </Button>
        </Box>
      </Container>
    );
  }
  
  // Calculate weight differential
  const originalWeight = batch.weight_details?.original_weight || batch.total_weight || 0;
  const reconciledWeight = batch.weight_details?.reconciled_weight || 0;
  const weightDifferential = originalWeight - reconciledWeight;
  const weightDifferentialPercentage = originalWeight > 0 
    ? ((weightDifferential / originalWeight) * 100).toFixed(1)
    : 0;
  
  // Calculate reconciliation progress
  const totalCrates = batch.crates?.length || 0;
  const reconciledCrates = batch.weight_details?.reconciled_crates || 0;

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/batches')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Batch #{batch.id}
          </Typography>
          <Chip
            label={formatStatus(batch.status)}
            color={getStatusColor(batch.status)}
            sx={{ ml: 2, fontWeight: 500 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {batch.status === 'PENDING' && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<LocalShippingIcon />}
                onClick={handleDispatch}
              >
                Dispatch
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </>
          )}
          
          {batch.status === 'DISPATCHED' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleArrive}
            >
              Mark as Arrived
            </Button>
          )}
          
          {batch.status === 'ARRIVED' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ReconcileIcon />}
              onClick={() => navigate(`/reconciliation/${batch.id}`)}
            >
              Reconcile
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => {
              // Share functionality would go here
              alert('Share functionality not implemented yet');
            }}
          >
            Share
          </Button>
        </Box>
      </Box>
      
      {/* Status Stepper */}
      <Box sx={{ mb: 4 }}>
        <StatusStepper
          status={batch.status}
          createdAt={batch.created_at}
          departedAt={batch.departed_at}
          arrivedAt={batch.arrived_at}
          reconciledAt={batch.reconciled_at}
          closedAt={batch.closed_at}
        />
      </Box>
      
      {/* Batch Details */}
      <Grid container spacing={3}>
        {/* Left Column - Batch Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Batch Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Farm
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {batch.farm?.name || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Packhouse
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {batch.packhouse?.name || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(batch.created_at)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created By
                  </Typography>
                  <Typography variant="body1">
                    {batch.created_by?.name || 'N/A'}
                  </Typography>
                </Grid>
                
                {batch.departed_at && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Departed At
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(batch.departed_at)}
                    </Typography>
                  </Grid>
                )}
                
                {batch.arrived_at && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Arrived At
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(batch.arrived_at)}
                    </Typography>
                  </Grid>
                )}
                
                {batch.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {batch.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
          
          {/* Weight Information Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weight Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Crates
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {totalCrates}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reconciled Crates
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {reconciledCrates}/{totalCrates}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Original Weight
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {originalWeight ? `${originalWeight.toFixed(1)} kg` : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reconciled Weight
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {reconciledWeight ? `${reconciledWeight.toFixed(1)} kg` : 'N/A'}
                  </Typography>
                </Grid>
                
                {(batch.status === 'RECONCILED' || batch.status === 'CLOSED') && (
                  <Grid item xs={12}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        bgcolor: weightDifferential > 0 ? 'error.light' : 'success.light',
                        borderRadius: 1,
                        mt: 1
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Weight Differential
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 500,
                          color: weightDifferential > 0 ? 'error.dark' : 'success.dark'
                        }}
                      >
                        {weightDifferential > 0 
                          ? `${weightDifferential.toFixed(1)} kg (${weightDifferentialPercentage}% loss)`
                          : 'No weight loss'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Right Column - Crates Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Crates
                </Typography>
                {batch.status === 'PENDING' && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(`/batches/${batch.id}/add-crate`)}
                  >
                    Add Crate
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {batch.crates && batch.crates.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>QR Code</TableCell>
                        <TableCell>Variety</TableCell>
                        <TableCell align="right">Weight (kg)</TableCell>
                        <TableCell align="right">Reconciled</TableCell>
                        {batch.status === 'PENDING' && <TableCell align="right">Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {batch.crates.map((crate) => (
                        <TableRow key={crate.id}>
                          <TableCell>{crate.qr_code}</TableCell>
                          <TableCell>{crate.variety?.name || 'N/A'}</TableCell>
                          <TableCell align="right">{crate.weight?.toFixed(1) || 'N/A'}</TableCell>
                          <TableCell align="right">
                            {crate.reconciled ? (
                              <Chip
                                label="Yes"
                                color="success"
                                size="small"
                              />
                            ) : (
                              <Chip
                                label="No"
                                color="default"
                                size="small"
                              />
                            )}
                          </TableCell>
                          {batch.status === 'PENDING' && (
                            <TableCell align="right">
                              <Tooltip title="Remove from batch">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    // Remove crate functionality would go here
                                    alert(`Remove crate ${crate.qr_code} functionality not implemented yet`);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No crates in this batch
                  </Typography>
                  {batch.status === 'PENDING' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate(`/batches/${batch.id}/add-crate`)}
                      sx={{ mt: 2 }}
                    >
                      Add Crate
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              confirmDialog.action();
              closeConfirmDialog();
            }} 
            color="primary" 
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BatchDetailPage;
