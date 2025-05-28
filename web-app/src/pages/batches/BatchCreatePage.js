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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { createBatch, clearBatchErrors } from '../../store/slices/batchSlice';
import { getFarms } from '../../store/slices/adminSlice';
import { getVarieties } from '../../store/slices/adminSlice';

const BatchCreatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { createLoading, createError } = useSelector((state) => state.batches);
  const { data: farms } = useSelector((state) => state.admin.farms);
  const { data: varieties } = useSelector((state) => state.admin.varieties);
  const user = useSelector((state) => state.auth.user);
  
  const [formData, setFormData] = useState({
    farm_id: '',
    variety_id: '',
    harvest_date: new Date(),
    estimated_weight: '',
    notes: '',
  });
  
  useEffect(() => {
    dispatch(getFarms());
    dispatch(getVarieties());
    dispatch(clearBatchErrors());
  }, [dispatch]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      harvest_date: date,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Format date to ISO string
    const batchData = {
      ...formData,
      harvest_date: formData.harvest_date.toISOString().split('T')[0],
      estimated_weight: parseFloat(formData.estimated_weight),
    };
    
    const resultAction = await dispatch(createBatch(batchData));
    
    if (createBatch.fulfilled.match(resultAction)) {
      navigate(`/batches/${resultAction.payload.id}`);
    }
  };
  
  // Check if user is manager or supervisor
  const isManagerOrSupervisor = user && (user.role === 'manager' || user.role === 'supervisor' || user.role === 'admin');
  
  // Redirect if not authorized
  if (!isManagerOrSupervisor) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          You do not have permission to create batches. Only managers and supervisors can create batches.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/batches')}
          sx={{ mt: 2 }}
        >
          Back to Batches
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/batches')}
          sx={{ mb: 2 }}
        >
          Back to Batches
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Batch
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
                <FormControl fullWidth required>
                  <InputLabel id="farm-label">Farm</InputLabel>
                  <Select
                    labelId="farm-label"
                    name="farm_id"
                    value={formData.farm_id}
                    onChange={handleChange}
                    label="Farm"
                    required
                  >
                    {farms.map((farm) => (
                      <MenuItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="variety-label">Mango Variety</InputLabel>
                  <Select
                    labelId="variety-label"
                    name="variety_id"
                    value={formData.variety_id}
                    onChange={handleChange}
                    label="Mango Variety"
                    required
                  >
                    {varieties.map((variety) => (
                      <MenuItem key={variety.id} value={variety.id}>
                        {variety.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Harvest Date"
                    value={formData.harvest_date}
                    onChange={handleDateChange}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="estimated_weight"
                  label="Estimated Weight (kg)"
                  type="number"
                  fullWidth
                  required
                  value={formData.estimated_weight}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
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
                    onClick={() => navigate('/batches')}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={createLoading}
                  >
                    {createLoading ? <CircularProgress size={24} /> : 'Create Batch'}
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

export default BatchCreatePage;
