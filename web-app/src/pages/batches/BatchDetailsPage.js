import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as BatchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../../constants/api';
import CrateVarietiesList from '../../components/crates/CrateVarietiesList';

const BatchDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState(null);
  const [crates, setCrates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch batch details and crates
  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch batch details
        const batchResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}`);
        setBatch(batchResponse.data);
        
        // Fetch crates in the batch
        const cratesResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCH_CRATES(id)}`);
        setCrates(cratesResponse.data.crates || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching batch data:', err);
        setError('Failed to load batch data: ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      }
    };
    
    fetchBatchData();
  }, [id]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
      case 'open':
        return '#2196F3'; // Blue
      case 'DISPATCHED':
      case 'departed':
        return '#FF9800'; // Orange
      case 'ARRIVED':
      case 'arrived':
        return '#4CAF50'; // Green
      case 'RECONCILED':
      case 'reconciled':
        return '#9C27B0'; // Purple
      case 'CLOSED':
      case 'closed':
        return '#795548'; // Brown
      case 'CANCELLED':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button
            variant="outlined"
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
  
  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/batches')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Batch Details
          </Typography>
        </Box>
        
        {/* Batch Info Card */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BatchIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" component="h2">
                Batch #{batch?.batch_code}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={batch?.status?.toUpperCase() || 'UNKNOWN'} 
                  sx={{ 
                    backgroundColor: getStatusColor(batch?.status),
                    color: 'white',
                    fontWeight: 'bold'
                  }} 
                />
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                From:
              </Typography>
              <Typography variant="body1">
                {batch?.from_location_name || 'Unknown'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                To:
              </Typography>
              <Typography variant="body1">
                {batch?.to_location_name || 'Unknown'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Created:
              </Typography>
              <Typography variant="body1">
                {formatDate(batch?.created_at)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Weight:
              </Typography>
              <Typography variant="body1">
                {batch?.total_weight ? `${batch.total_weight} kg` : 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Crates list */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Crates in Batch ({crates.length})
          </Typography>
          
          {/* Crate Varieties Summary */}
          {crates.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <CrateVarietiesList crates={crates} showDivider={false} />
            </Box>
          )}
          
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
                      label={crate.reconciled ? 'RECONCILED' : 'PENDING'} 
                      size="small"
                      sx={{ 
                        backgroundColor: crate.reconciled ? '#4CAF50' : '#FF9800',
                        color: 'white'
                      }} 
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default BatchDetailsPage;
