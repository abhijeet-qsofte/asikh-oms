import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Agriculture as FarmIcon,
} from '@mui/icons-material';
import {
  getFarms,
  createFarm,
  updateFarm,
  deleteFarm,
  setCurrentItem,
  clearCurrentItem,
  clearFormError,
} from '../../store/slices/adminSlice';

const FarmsPage = () => {
  const dispatch = useDispatch();
  const { data: farms, loading, error } = useSelector((state) => state.admin.farms);
  const { formLoading, formError, currentItem } = useSelector((state) => state.admin);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_person: '',
    phone: '',
    email: '',
  });
  
  useEffect(() => {
    dispatch(getFarms());
  }, [dispatch]);
  
  useEffect(() => {
    if (currentItem) {
      setFormData({
        name: currentItem.name || '',
        location: currentItem.location || '',
        contact_person: currentItem.contact_person || '',
        phone: currentItem.phone || '',
        email: currentItem.email || '',
      });
    } else {
      setFormData({
        name: '',
        location: '',
        contact_person: '',
        phone: '',
        email: '',
      });
    }
  }, [currentItem]);
  
  const handleOpenDialog = (farm = null) => {
    if (farm) {
      dispatch(setCurrentItem(farm));
    } else {
      dispatch(clearCurrentItem());
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    dispatch(clearFormError());
  };
  
  const handleOpenDeleteDialog = (farm) => {
    dispatch(setCurrentItem(farm));
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleSubmit = async () => {
    if (currentItem) {
      await dispatch(updateFarm({ id: currentItem.id, farmData: formData }));
    } else {
      await dispatch(createFarm(formData));
    }
    
    // Close dialog if no error
    if (!formError) {
      handleCloseDialog();
    }
  };
  
  const handleDelete = async () => {
    if (currentItem) {
      await dispatch(deleteFarm(currentItem.id));
      handleCloseDeleteDialog();
    }
  };
  
  // Validate phone number format
  const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phone === '' || phoneRegex.test(phone);
  };
  
  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email === '' || emailRegex.test(email);
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      isValidPhone(formData.phone) &&
      isValidEmail(formData.email)
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Farms
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Add, edit, or delete farms in the system.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Farm
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : farms.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <FarmIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Farms Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first farm to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Farm
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell>{farm.name}</TableCell>
                    <TableCell>{farm.location || 'N/A'}</TableCell>
                    <TableCell>{farm.contact_person || 'N/A'}</TableCell>
                    <TableCell>{farm.phone || 'N/A'}</TableCell>
                    <TableCell>{farm.email || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(farm)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          color="error" 
                          onClick={() => handleOpenDeleteDialog(farm)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      
      {/* Add/Edit Farm Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentItem ? 'Edit Farm' : 'Add Farm'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 3, mt: 1 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Farm Name"
            fullWidth
            required
            value={formData.name}
            onChange={handleChange}
            error={formData.name.trim() === ''}
            helperText={formData.name.trim() === '' ? 'Farm name is required' : ''}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="location"
            label="Location"
            fullWidth
            value={formData.location}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="contact_person"
            label="Contact Person"
            fullWidth
            value={formData.contact_person}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="phone"
            label="Phone Number"
            fullWidth
            value={formData.phone}
            onChange={handleChange}
            error={!isValidPhone(formData.phone)}
            helperText={!isValidPhone(formData.phone) ? 'Enter a valid phone number (10-15 digits, optional + prefix)' : ''}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={handleChange}
            error={!isValidEmail(formData.email)}
            helperText={!isValidEmail(formData.email) ? 'Enter a valid email address' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={!isFormValid() || formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Farm</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the farm "{currentItem?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FarmsPage;
