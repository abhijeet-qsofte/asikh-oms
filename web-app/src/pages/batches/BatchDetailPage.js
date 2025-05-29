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
  CompareArrows as ReconcileIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  QrCode as QrCodeIcon,
  AddBox as AddBoxIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL, ENDPOINTS } from '../../constants/api';
import StatusStepper from '../../components/batches/StatusStepper';
import BatchEditForm from '../../components/batches/BatchEditForm';

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [packhouses, setPackhouses] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  
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
        
        // Fetch farms for edit form
        const farmsResponse = await axios.get(`${API_URL}${ENDPOINTS.FARMS}`);
        const farmsData = farmsResponse.data.farms || [];
        
        // Fetch packhouses for edit form
        const packhousesResponse = await axios.get(`${API_URL}${ENDPOINTS.PACKHOUSES}`);
        const packhousesData = packhousesResponse.data.packhouses || [];
        
        // Fetch varieties for edit form
        const varietiesResponse = await axios.get(`${API_URL}${ENDPOINTS.VARIETIES}`);
        const varietiesData = varietiesResponse.data.varieties || [];
        
        // Create a map of farms and packhouses for easy lookup
        const farmMap = {};
        farmsData.forEach(farm => {
          farmMap[farm.id] = farm;
        });
        
        const packhouseMap = {};
        packhousesData.forEach(packhouse => {
          packhouseMap[packhouse.id] = packhouse;
        });
        
        // Enhance batch with farm and packhouse objects
        const enhancedBatch = {
          ...batchData,
          weight_details: weightData,
          // Add farm object if farm_id exists
          farm: batchData.farm_id && farmMap[batchData.farm_id] ? farmMap[batchData.farm_id] : null,
          // Add packhouse object if packhouse_id exists
          packhouse: batchData.packhouse_id && packhouseMap[batchData.packhouse_id] ? packhouseMap[batchData.packhouse_id] : null,
          // Make sure farm_name is set
          farm_name: batchData.farm_name || (batchData.farm_id && farmMap[batchData.farm_id] ? farmMap[batchData.farm_id].name : null),
          // Make sure packhouse_name is set
          packhouse_name: batchData.packhouse_name || (batchData.packhouse_id && packhouseMap[batchData.packhouse_id] ? packhouseMap[batchData.packhouse_id].name : null),
        };
        
        setBatch(enhancedBatch);
        setFarms(farmsData);
        setPackhouses(packhousesData);
        setVarieties(varietiesData);
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
  
  // Handle opening the edit dialog
  const handleEditClick = () => {
    setEditDialogOpen(true);
    setEditError(null);
  };
  
  // Handle closing the edit dialog
  const handleEditClose = () => {
    setEditDialogOpen(false);
  };
  
  // Handle saving batch edits
  const handleSaveBatch = async (formData) => {
    try {
      setEditLoading(true);
      setEditError(null);
      
      // Format dates for API
      const formatDate = (date) => {
        if (!date) return null;
        return new Date(date).toISOString();
      };
      
      const updatedBatch = {
        ...formData,
        created_at: formatDate(formData.created_at),
        departed_at: formatDate(formData.departed_at),
        arrived_at: formatDate(formData.arrived_at),
        reconciled_at: formatDate(formData.reconciled_at),
        closed_at: formatDate(formData.closed_at),
      };
      
      // Update batch
      const response = await axios.put(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}`, updatedBatch);
      
      // Update local state with new data
      setBatch({
        ...batch,
        ...response.data,
      });
      
      setEditLoading(false);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating batch:', error);
      setEditError('Failed to update batch: ' + (error.response?.data?.detail || error.message));
      setEditLoading(false);
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
  
  // Helper function to safely get nested properties
  const getNestedValue = (obj, path, defaultValue = 'N/A') => {
    if (!obj) return defaultValue;
    
    // Handle both string paths and array paths
    const parts = typeof path === 'string' ? path.split('.') : path;
    
    let result = obj;
    for (const part of parts) {
      if (result == null || result[part] === undefined) {
        return defaultValue;
      }
      result = result[part];
    }
    
    return result === null || result === undefined ? defaultValue : result;
  };
  
  // Get farm name from various possible locations in the data structure
  const getFarmName = () => {
    // Try all possible paths where farm name might be stored
    return getNestedValue(batch, 'farm.name') || 
           getNestedValue(batch, 'farm_name') || 
           getNestedValue(batch, 'farm_id.name') || 
           getNestedValue(batch, 'from_location_name') || 
           'N/A';
  };
  
  // Get packhouse name from various possible locations
  const getPackhouseName = () => {
    return getNestedValue(batch, 'packhouse.name') || 
           getNestedValue(batch, 'packhouse_name') || 
           getNestedValue(batch, 'packhouse_id.name') || 
           getNestedValue(batch, 'to_location_name') || 
           'N/A';
  };
  
  // Debug batch data structure
  console.log('Batch detail data:', batch);
  console.log('Farm name:', getFarmName());
  console.log('Packhouse name:', getPackhouseName());
  
  // Calculate weight differential
  const originalWeight = batch.weight_details?.original_weight || batch.total_weight || batch.weight || 0;
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
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Edit
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
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ReconcileIcon />}
                onClick={() => navigate(`/reconciliation/${batch.id}`)}
              >
                Reconcile
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<QrCodeIcon />}
                onClick={() => navigate(`/batches/${batch.id}/reconciliation`)}
              >
                Scan & Reconcile
              </Button>
              {batch.status === 'PENDING' && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AddBoxIcon />}
                  onClick={() => navigate(`/batches/${batch.id}/add-crates`)}
                >
                  Add Crates
                </Button>
              )}
            </>
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
          
          {/* Edit button for all statuses except PENDING (which has its own edit button above) */}
          {batch.status !== 'PENDING' && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditClick}
            >
              Edit
            </Button>
          )}
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
                    {getFarmName()}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Packhouse
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {getPackhouseName()}
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
                    {batch.created_by?.name || batch.supervisor_name || 'N/A'}
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
          
          {/* Batch Summary Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Batch Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3, mt: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {batch.total_crates || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Crates
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {batch.total_weight ? `${batch.total_weight.toFixed(1)}` : '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Weight (kg)
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
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
        
        {/* Right Column - Crates Table and Batch Statistics */}
        <Grid item xs={12} md={6}>
          {/* Batch Statistics Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {batch.weight_details && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Average Crate Weight
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {batch.total_crates > 0 
                          ? (batch.total_weight / batch.total_crates).toFixed(1) + ' kg' 
                          : 'N/A'}
                      </Typography>
                      {batch.weight_details && batch.weight_details.weight_differential !== undefined && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Weight Differential
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500, 
                              color: batch.weight_details.weight_differential > 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {batch.weight_details.weight_differential.toFixed(1)} kg
                            {batch.weight_details.weight_differential > 0 ? ' (gain)' : ' (loss)'}
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Reconciliation Status
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {batch.status === 'RECONCILED' ? 'Complete' : 'In Progress'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Reconciliation Date
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {batch.reconciled_at ? formatDate(batch.reconciled_at) : 'Not reconciled'}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
          
          {/* Crates Table Card */}
          <Card sx={{ height: 'calc(100% - 200px)' }}>
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
      
      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
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
      
      {/* Batch Edit Form */}
      <BatchEditForm
        batch={batch}
        farms={farms}
        packhouses={packhouses}
        varieties={varieties}
        open={editDialogOpen}
        onClose={handleEditClose}
        onSave={handleSaveBatch}
        loading={editLoading}
        error={editError}
      />
    </Container>
  );
};

export default BatchDetailPage;
