import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ManualEntryDialog = ({ open, onClose, onSubmit }) => {
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    setQrCode(e.target.value);
    setError('');
  };
  
  const handleSubmit = () => {
    if (!qrCode.trim()) {
      setError('Please enter a QR code');
      return;
    }
    
    onSubmit(qrCode.trim());
    setQrCode('');
  };
  
  const handleClose = () => {
    setQrCode('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Manual QR Code Entry</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Enter the QR code manually if the scanner is not working or the QR code is damaged.
        </Typography>
        
        <TextField
          autoFocus
          label="QR Code"
          value={qrCode}
          onChange={handleChange}
          fullWidth
          error={!!error}
          helperText={error}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualEntryDialog;
