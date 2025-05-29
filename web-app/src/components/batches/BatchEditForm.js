import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';

/**
 * BatchEditForm component for editing batch details
 */
const BatchEditForm = ({
  batch,
  farms,
  packhouses,
  varieties,
  open,
  onClose,
  onSave,
  loading,
  error,
}) => {
  const [formData, setFormData] = useState({
    farm_id: '',
    packhouse_id: '',
    notes: '',
    status: '',
    created_at: null,
    departed_at: null,
    arrived_at: null,
    reconciled_at: null,
    closed_at: null,
  });

  // Initialize form data when batch changes
  useEffect(() => {
    if (batch) {
      setFormData({
        farm_id: batch.farm_id || '',
        packhouse_id: batch.packhouse_id || '',
        notes: batch.notes || '',
        status: batch.status || '',
        created_at: batch.created_at ? new Date(batch.created_at) : null,
        departed_at: batch.departed_at ? new Date(batch.departed_at) : null,
        arrived_at: batch.arrived_at ? new Date(batch.arrived_at) : null,
        reconciled_at: batch.reconciled_at ? new Date(batch.reconciled_at) : null,
        closed_at: batch.closed_at ? new Date(batch.closed_at) : null,
      });
    }
  }, [batch]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle date field changes
  const handleDateChange = (name, date) => {
    setFormData({
      ...formData,
      [name]: date,
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit Batch #{batch?.id}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Farm</InputLabel>
                  <Select
                    name="farm_id"
                    value={formData.farm_id}
                    onChange={handleChange}
                    label="Farm"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {farms.map((farm) => (
                      <MenuItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Packhouse</InputLabel>
                  <Select
                    name="packhouse_id"
                    value={formData.packhouse_id}
                    onChange={handleChange}
                    label="Packhouse"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {packhouses.map((packhouse) => (
                      <MenuItem key={packhouse.id} value={packhouse.id}>
                        {packhouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  name="notes"
                  label="Notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                    <MenuItem value="ARRIVED">Arrived</MenuItem>
                    <MenuItem value="RECONCILED">Reconciled</MenuItem>
                    <MenuItem value="CLOSED">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Timestamps
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Created At"
                  value={formData.created_at}
                  onChange={(date) => handleDateChange('created_at', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Departed At"
                  value={formData.departed_at}
                  onChange={(date) => handleDateChange('departed_at', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Arrived At"
                  value={formData.arrived_at}
                  onChange={(date) => handleDateChange('arrived_at', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Reconciled At"
                  value={formData.reconciled_at}
                  onChange={(date) => handleDateChange('reconciled_at', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Closed At"
                  value={formData.closed_at}
                  onChange={(date) => handleDateChange('closed_at', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </form>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<CancelIcon />}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchEditForm;
