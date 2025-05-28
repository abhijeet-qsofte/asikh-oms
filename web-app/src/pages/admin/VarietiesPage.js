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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as VarietyIcon,
} from '@mui/icons-material';
import {
  getVarieties,
  createVariety,
  updateVariety,
  deleteVariety,
  setCurrentItem,
  clearCurrentItem,
  clearFormError,
} from '../../store/slices/adminSlice';

const VarietiesPage = () => {
  const dispatch = useDispatch();
  const { data: varieties, loading, error } = useSelector((state) => state.admin.varieties);
  const { formLoading, formError, currentItem } = useSelector((state) => state.admin);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  
  useEffect(() => {
    dispatch(getVarieties());
  }, [dispatch]);
  
  useEffect(() => {
    if (currentItem) {
      setFormData({
        name: currentItem.name || '',
        description: currentItem.description || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
      });
    }
  }, [currentItem]);
  
  const handleOpenDialog = (variety = null) => {
    if (variety) {
      dispatch(setCurrentItem(variety));
    } else {
      dispatch(clearCurrentItem());
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    dispatch(clearFormError());
  };
  
  const handleOpenDeleteDialog = (variety) => {
    dispatch(setCurrentItem(variety));
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
      await dispatch(updateVariety({ id: currentItem.id, varietyData: formData }));
    } else {
      await dispatch(createVariety(formData));
    }
    
    // Close dialog if no error
    if (!formError) {
      handleCloseDialog();
    }
  };
  
  const handleDelete = async () => {
    if (currentItem) {
      await dispatch(deleteVariety(currentItem.id));
      handleCloseDeleteDialog();
    }
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return formData.name.trim() !== '';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Mango Varieties
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Add, edit, or delete mango varieties in the system.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Variety
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
        ) : varieties.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <VarietyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Varieties Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first mango variety to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Variety
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {varieties.map((variety) => (
                  <TableRow key={variety.id}>
                    <TableCell>{variety.name}</TableCell>
                    <TableCell>{variety.description || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(variety)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          color="error" 
                          onClick={() => handleOpenDeleteDialog(variety)}
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
      
      {/* Add/Edit Variety Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentItem ? 'Edit Variety' : 'Add Variety'}
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
            label="Variety Name"
            fullWidth
            required
            value={formData.name}
            onChange={handleChange}
            error={formData.name.trim() === ''}
            helperText={formData.name.trim() === '' ? 'Variety name is required' : ''}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={formData.description}
            onChange={handleChange}
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
        <DialogTitle>Delete Variety</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the variety "{currentItem?.name}"? This action cannot be undone.
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

export default VarietiesPage;
