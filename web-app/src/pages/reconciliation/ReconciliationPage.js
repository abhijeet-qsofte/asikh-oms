import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalShipping as BatchIcon,
  CompareArrows as ReconcileIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL, ENDPOINTS } from '../../constants/api';
import BatchCard from '../../components/batches/BatchCard';

const ReconciliationPage = () => {
  const navigate = useNavigate();
  
  const [batches, setBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchBatches();
  }, []);
  
  const fetchBatches = async () => {
    try {
      setLoading(true);
      
      // Fetch batches that are in ARRIVED status (ready for reconciliation)
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCHES}?status=ARRIVED`);
      const batchesData = response.data;
      
      // Fetch weight details for each batch
      const batchesWithWeightDetails = await Promise.all(
        batchesData.map(async (batch) => {
          try {
            const weightResponse = await axios.get(
              `${API_URL}${ENDPOINTS.BATCH_WEIGHT_DETAILS(batch.id)}`
            );
            return {
              ...batch,
              weight_details: weightResponse.data,
            };
          } catch (error) {
            console.error(`Error fetching weight details for batch ${batch.id}:`, error);
            return {
              ...batch,
              weight_details: null,
            };
          }
        })
      );
      
      setBatches(batchesWithWeightDetails);
      setFilteredBatches(batchesWithWeightDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching batches for reconciliation:', error);
      setError('Failed to load batches for reconciliation');
      setLoading(false);
    }
  };
  
  // Filter batches based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBatches(batches);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = batches.filter(
        (batch) =>
          batch.id.toString().includes(term) ||
          (batch.farm?.name && batch.farm.name.toLowerCase().includes(term)) ||
          (batch.packhouse?.name && batch.packhouse.name.toLowerCase().includes(term)) ||
          (batch.notes && batch.notes.toLowerCase().includes(term))
      );
      setFilteredBatches(filtered);
    }
  }, [searchTerm, batches]);
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleRefresh = () => {
    fetchBatches();
  };
  
  const handleBatchClick = (batchId) => {
    navigate(`/reconciliation/${batchId}`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Batch Reconciliation
          </Typography>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Reconcile batches that have arrived at the packhouse by verifying crates and recording their weights.
        </Typography>
        
        <TextField
          fullWidth
          placeholder="Search batches by ID, farm, or packhouse"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : filteredBatches.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          sx={{ textAlign: 'center' }}
        >
          <ReconcileIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No batches to reconcile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no batches in the "Arrived" status that need reconciliation.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredBatches.map((batch) => (
            <Grid item xs={12} sm={6} md={4} key={batch.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderLeft: 4,
                  borderColor: 'success.main',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea onClick={() => handleBatchClick(batch.id)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BatchIcon sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="h6" component="div">
                          Batch #{batch.batch_code || batch.id}
                        </Typography>
                      </Box>
                      <Chip
                        label="Ready for Reconciliation"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                    
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Farm:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {batch.farm?.name || 'N/A'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Packhouse:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {batch.packhouse?.name || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Total Crates:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {batch.crates?.length || 0}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Original Weight:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {batch.total_weight ? `${batch.total_weight.toFixed(1)} kg` : 'N/A'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Arrived:
                        </Typography>
                        <Typography variant="body2">
                          {batch.arrived_at ? format(new Date(batch.arrived_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mt: 2,
                        p: 1,
                        bgcolor: 'primary.light',
                        borderRadius: 1,
                      }}
                    >
                      <ReconcileIcon sx={{ color: 'primary.dark', mr: 1 }} />
                      <Typography variant="body2" color="primary.dark" sx={{ fontWeight: 500 }}>
                        Start Reconciliation
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ReconciliationPage;
