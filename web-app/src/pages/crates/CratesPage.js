import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { getCrates, updateCrate, deleteCrate } from '../../store/slices/crateSlice';
import { getVarieties } from '../../store/slices/varietySlice';
import { getFarms } from '../../store/slices/farmSlice';
import CrateList from '../../components/crates/CrateList';

const CratesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { crates, loading, error, pagination } = useSelector((state) => state.crates);
  const { varieties } = useSelector((state) => state.varieties);
  const { farms } = useSelector((state) => state.farms);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [crateToDelete, setCrateToDelete] = useState(null);
  
  // Fetch crates, varieties, and farms on component mount
  useEffect(() => {
    dispatch(getCrates({ page: currentPage, page_size: 20 }));
    dispatch(getVarieties());
    dispatch(getFarms());
  }, [dispatch, currentPage]);
  
  // Handle filter changes
  const handleFilter = (filterParams) => {
    setFilters(filterParams);
    setCurrentPage(1);
    dispatch(getCrates({ ...filterParams, page: 1 }));
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // With our client-side pagination, we only need to fetch from API
    // if we don't have the data or if filters are applied
    if (Object.keys(filters).length > 0) {
      dispatch(getCrates({ ...filters, page }));
    } else {
      dispatch(getCrates({ page }));
    }
  };
  
  // Handle crate update
  const handleCrateUpdate = (updatedCrate) => {
    console.log('Updating crate in CratesPage:', updatedCrate);
    // Make sure we're passing the correct format to the updateCrate action
    dispatch(updateCrate(updatedCrate));
  };
  
  // Handle crate delete
  const handleCrateDelete = (crateId) => {
    setCrateToDelete(crateId);
    setDeleteDialogOpen(true);
  };
  
  // Confirm crate deletion
  const confirmDelete = () => {
    if (crateToDelete) {
      dispatch(deleteCrate(crateToDelete));
      setDeleteDialogOpen(false);
      setCrateToDelete(null);
    }
  };
  
  // Cancel crate deletion
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setCrateToDelete(null);
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <div>
            <Typography variant="h4" component="h1" gutterBottom>
              Crates
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View and manage all crates in the system.
            </Typography>
          </div>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/crates/create')}
          >
            Add Crate
          </Button>
        </Box>
      </Box>
      
      {/* Crate List Component */}
      <CrateList
        crates={crates || []}
        varieties={varieties || []}
        farms={farms || []}
        loading={loading}
        error={error}
        totalPages={pagination?.total_pages || 1}
        totalItems={pagination?.total || 0}
        currentPage={currentPage}
        pageSize={pagination?.page_size || 20}
        onPageChange={handlePageChange}
        onUpdate={handleCrateUpdate}
        onDelete={handleCrateDelete}
        onFilter={handleFilter}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this crate? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CratesPage;
