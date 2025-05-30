import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import QRScanner from '../../components/qrcode/QRScanner';
import { format } from 'date-fns';
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../../constants/api';

const BatchAddCratesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState(null);
  const [crates, setCrates] = useState([]);
  const [unassignedCrates, setUnassignedCrates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualQRCode, setManualQRCode] = useState('');
  const [minimalCrateOpen, setMinimalCrateOpen] = useState(false);
  const [minimalCrateData, setMinimalCrateData] = useState({
    qr_code: '',
    variety_id: '',
    weight: 1.0,
    notes: ''
  });
  const [varieties, setVarieties] = useState([]);
  
  // Fetch varieties data
  const fetchVarieties = useCallback(async () => {
    try {
      const varietiesResponse = await axios.get(`${API_URL}${ENDPOINTS.VARIETIES}`);
      setVarieties(varietiesResponse.data || []);
    } catch (err) {
      console.error('Error fetching varieties:', err);
    }
  }, []);

  // Fetch batch and crates data using useCallback to prevent dependency changes on every render
  const fetchBatchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch batch details
      const batchResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}`);
      setBatch(batchResponse.data);
      
      // Fetch crates in the batch
      const cratesResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCH_CRATES(id)}`);
      setCrates(cratesResponse.data.crates || []);
      
      // Fetch unassigned crates
      console.log('Fetching unassigned crates from:', `${API_URL}${ENDPOINTS.CRATES_UNASSIGNED}`);
      const unassignedResponse = await axios.get(`${API_URL}${ENDPOINTS.CRATES_UNASSIGNED}`);
      console.log('Unassigned crates response:', unassignedResponse);
      setUnassignedCrates(unassignedResponse.data || []);
      console.log('Unassigned crates set to:', unassignedResponse.data || []);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching batch data:', err);
      setError('Failed to load batch data: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  }, [id]);
  
  // Load batch data and varieties on mount
  useEffect(() => {
    fetchBatchData();
    fetchVarieties();
  }, [id, fetchBatchData, fetchVarieties]);
  
  // Handle QR code scan
  const handleScan = async (qrCode) => {
    setScanning(false);
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Add crate to batch
      await axios.post(`${API_URL}${ENDPOINTS.BATCH_ADD_CRATE(id)}`, { qr_code: qrCode });
      
      // Show success message
      setSuccess(`Crate ${qrCode} added to batch successfully`);
      
      // Refresh crate list
      fetchBatchData();
    } catch (err) {
      console.error('Error adding crate to batch:', err);
      setError('Failed to add crate: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };
  
  // Handle adding an existing unassigned crate to the batch
  const handleAddExistingCrate = async (crateId) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Add crate to batch using the crate ID
      await axios.post(`${API_URL}${ENDPOINTS.BATCH_ADD_CRATE(id)}`, { crate_id: crateId });
      
      // Show success message
      setSuccess(`Crate added to batch successfully`);
      
      // Refresh crate list
      fetchBatchData();
    } catch (err) {
      console.error('Error adding crate to batch:', err);
      setError('Failed to add crate: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };
  
  // Handle manual QR code entry
  const handleManualSubmit = () => {
    if (!manualQRCode.trim()) {
      setError('Please enter a QR code');
      return;
    }
    
    handleScan(manualQRCode.trim());
    setManualQRCode('');
    setManualEntry(false);
  };

  // Handle minimal crate form changes
  const handleMinimalCrateChange = (e) => {
    const { name, value } = e.target;
    setMinimalCrateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle minimal crate submission
  const handleMinimalCrateSubmit = async () => {
    if (!minimalCrateData.qr_code.trim()) {
      setError('Please enter a QR code');
      return;
    }

    if (!minimalCrateData.variety_id) {
      setError('Please select a mango variety');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Add minimal crate to batch
      await axios.post(`${API_URL}${ENDPOINTS.BATCH_ADD_MINIMAL_CRATE(id)}`, minimalCrateData);
      
      // Show success message
      setSuccess(`Crate ${minimalCrateData.qr_code} added to batch successfully`);
      
      // Reset form
      setMinimalCrateData({
        qr_code: '',
        variety_id: '',
        weight: 1.0,
        notes: ''
      });
      
      // Close dialog
      setMinimalCrateOpen(false);
      
      // Refresh crate list
      fetchBatchData();
    } catch (err) {
      console.error('Error adding minimal crate to batch:', err);
      setError('Failed to add crate: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return '#2196F3'; // Blue
      case 'DISPATCHED':
        return '#FF9800'; // Orange
      case 'ARRIVED':
        return '#4CAF50'; // Green
      case 'RECONCILED':
        return '#9C27B0'; // Purple
      case 'CLOSED':
        return '#795548'; // Brown
      case 'CANCELLED':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Render loading state
  if (loading && !batch) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate(`/batches/${id}`)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Add Crates to Batch {batch?.batch_code ? `#${batch.batch_code}` : ''}
          </Typography>
        </Box>
        
        {/* Batch info summary */}
        {batch && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">
                  Batch: {batch.batch_code}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Created: {formatDate(batch.created_at)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                <Chip 
                  label={batch.status} 
                  sx={{ 
                    backgroundColor: getStatusColor(batch.status),
                    color: 'white',
                    fontWeight: 'bold'
                  }} 
                />
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {/* Error and success messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<QrCodeIcon />}
            onClick={() => setScanning(true)}
            disabled={batch?.status !== 'open'}
          >
            Scan QR Code
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => setManualEntry(true)}
            disabled={batch?.status !== 'open'}
          >
            Enter QR Code Manually
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setMinimalCrateOpen(true)}
            disabled={batch?.status !== 'open'}
          >
            Add New Crate
          </Button>
        </Box>
      </Box>
      
      {/* Crates list */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Crates in Batch ({crates.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {crates.length === 0 ? (
          <Typography variant="body1" sx={{ py: 4, textAlign: 'center' }}>
            No crates have been added to this batch yet.
          </Typography>
        ) : (
          <List>
            {crates.map((crate) => (
              <ListItem key={crate.id} divider>
                <ListItemText
                  primary={`QR Code: ${crate.qr_code}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="textPrimary">
                        Weight: {crate.weight || 'N/A'} kg
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="textSecondary">
                        Variety: {crate.variety_name || 'N/A'}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="textSecondary">
                        Added: {formatDate(crate.created_at)}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={crate.status || 'UNKNOWN'} 
                    size="small"
                    sx={{ 
                      backgroundColor: crate.status === 'RECONCILED' ? '#4CAF50' : '#FF9800',
                      color: 'white'
                    }} 
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Unassigned Crates list */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Available Unassigned Crates ({unassignedCrates.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {unassignedCrates.length === 0 ? (
          <Typography variant="body1" sx={{ py: 4, textAlign: 'center' }}>
            No unassigned crates available.
          </Typography>
        ) : (
          <List>
            {unassignedCrates.map((crate) => (
              <ListItem key={crate.id} divider>
                <ListItemText
                  primary={`QR Code: ${crate.qr_code}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="textPrimary">
                        Weight: {crate.weight || 'N/A'} kg
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="textSecondary">
                        Variety: {crate.variety_name || 'N/A'}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="textSecondary">
                        Farm: {crate.farm_name || 'N/A'}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleAddExistingCrate(crate.id)}
                    disabled={batch?.status !== 'open'}
                  >
                    Add to Batch
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      
      {/* QR Scanner Dialog */}
      <Dialog
        open={scanning}
        onClose={() => setScanning(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          <QRScanner 
            onScan={handleScan}
            onError={(err) => setError(err)}
            onClose={() => setScanning(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanning(false)} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Manual Entry Dialog */}
      <Dialog
        open={manualEntry}
        onClose={() => setManualEntry(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Enter QR Code Manually</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="qrCode"
            label="QR Code"
            type="text"
            fullWidth
            variant="outlined"
            value={manualQRCode}
            onChange={(e) => setManualQRCode(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualEntry(false)}>Cancel</Button>
          <Button onClick={handleManualSubmit} variant="contained" color="primary">
            Add Crate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Minimal crate creation dialog */}
      <Dialog open={minimalCrateOpen} onClose={() => setMinimalCrateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Crate with Minimal Information</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              id="qr_code"
              name="qr_code"
              label="QR Code *"
              type="text"
              fullWidth
              variant="outlined"
              value={minimalCrateData.qr_code}
              onChange={handleMinimalCrateChange}
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="variety-label">Mango Variety *</InputLabel>
              <Select
                labelId="variety-label"
                id="variety_id"
                name="variety_id"
                value={minimalCrateData.variety_id}
                label="Mango Variety *"
                onChange={handleMinimalCrateChange}
                required
              >
                {varieties.map((variety) => (
                  <MenuItem key={variety.id} value={variety.id}>
                    {variety.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="dense"
              id="weight"
              name="weight"
              label="Weight (kg)"
              type="number"
              fullWidth
              variant="outlined"
              value={minimalCrateData.weight}
              onChange={handleMinimalCrateChange}
              sx={{ mb: 2 }}
              InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
              helperText="Default is 1.0 kg if not specified"
            />
            
            <TextField
              margin="dense"
              id="notes"
              name="notes"
              label="Notes"
              type="text"
              fullWidth
              variant="outlined"
              value={minimalCrateData.notes}
              onChange={handleMinimalCrateChange}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMinimalCrateOpen(false)}>Cancel</Button>
          <Button onClick={handleMinimalCrateSubmit} variant="contained" color="primary">
            Add Crate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BatchAddCratesPage;
