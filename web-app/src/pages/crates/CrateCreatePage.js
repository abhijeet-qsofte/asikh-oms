import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { createCrate, clearCrateErrors } from '../../store/slices/crateSlice';
import { getBatches } from '../../store/slices/batchSlice';

const CrateCreatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { createLoading, createError } = useSelector((state) => state.crates);
  const { batches, loading: batchesLoading } = useSelector((state) => state.batches);
  const user = useSelector((state) => state.auth.user);
  
  const [formData, setFormData] = useState({
    qr_code: '',
    batch_id: '',
    farm_weight: '',
    notes: '',
  });
  
  useEffect(() => {
    dispatch(getBatches());
    dispatch(clearCrateErrors());
  }, [dispatch]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Format data for submission
    const crateData = {
      ...formData,
      farm_weight: formData.farm_weight ? parseFloat(formData.farm_weight) : null,
    };
    
    const resultAction = await dispatch(createCrate(crateData));
    
    if (createCrate.fulfilled.match(resultAction)) {
      navigate(`/crates/${resultAction.payload.id}`);
    }
  };
  
  // Check if user is manager, supervisor, or harvester
  const isAuthorized = user && (
    user.role === 'manager' || 
    user.role === 'supervisor' || 
    user.role === 'harvester' || 
    user.role === 'admin'
  );
  
  // Redirect if not authorized
  if (!isAuthorized) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          You do not have permission to create crates. Only managers, supervisors, and harvesters can create crates.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crates')}
          sx={{ mt: 2 }}
        >
          Back to Crates
        </Button>
      </Container>
    );
  }
  
  // Filter batches to only show active ones (not completed, reconciled, or delivered)
  const activeBatches = batches && Array.isArray(batches) ? batches.filter(
    (batch) => {
      const status = batch.status ? batch.status.toLowerCase() : '';
      return !['completed', 'reconciled', 'delivered', 'closed'].includes(status);
    }
  ) : [];
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crates')}
          sx={{ mb: 2 }}
        >
          Back to Crates
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Crate
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          {createError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {createError}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="qr_code"
                  label="QR Code"
                  fullWidth
                  value={formData.qr_code}
                  onChange={handleChange}
                  helperText="Optional. You can scan or assign a QR code later."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="batch-label">Batch</InputLabel>
                  <Select
                    labelId="batch-label"
                    name="batch_id"
                    value={formData.batch_id}
                    onChange={handleChange}
                    label="Batch"
                    required
                    disabled={batchesLoading}
                  >
                    {batchesLoading ? (
                      <MenuItem disabled>Loading batches...</MenuItem>
                    ) : activeBatches.length === 0 ? (
                      <MenuItem disabled>No active batches available</MenuItem>
                    ) : (
                      activeBatches.map((batch) => (
                        <MenuItem key={batch.id} value={batch.id}>
                          Batch #{batch.id} - {batch.farm_name} ({batch.variety_name})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="farm_weight"
                  label="Farm Weight (kg)"
                  type="number"
                  fullWidth
                  value={formData.farm_weight}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText="Optional. You can add the weight later during reconciliation."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Notes"
                  multiline
                  rows={4}
                  fullWidth
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => navigate('/crates')}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={createLoading || !formData.batch_id}
                  >
                    {createLoading ? <CircularProgress size={24} /> : 'Create Crate'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default CrateCreatePage;
