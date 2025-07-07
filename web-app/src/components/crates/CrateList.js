import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  QrCode as QrCodeIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import CrateCard from './CrateCard';

/**
 * CrateList component for displaying a list of crates with filtering and sorting options
 */
const CrateList = ({
  crates = [],
  varieties = [],
  farms = [],
  loading = false,
  error = null,
  totalPages = 1,
  totalItems = 0,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  onUpdate,
  onDelete,
  onFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterFarm, setFilterFarm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    switch (name) {
      case 'variety':
        setFilterVariety(value);
        break;
      case 'farm':
        setFilterFarm(value);
        break;
      case 'status':
        setFilterStatus(value);
        break;
      default:
        break;
    }
  };
  
  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };
  
  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };
  
  // Apply filters
  const applyFilters = () => {
    setFiltersApplied(true);
    
    if (onFilter) {
      onFilter({
        search: searchTerm,
        variety_id: filterVariety,
        farm_id: filterFarm,
        status: filterStatus,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
    }
  };
  
  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterVariety('');
    setFilterFarm('');
    setFilterStatus('');
    setSortBy('created_at');
    setSortOrder('desc');
    setFiltersApplied(false);
    
    if (onFilter) {
      onFilter({});
    }
  };
  
  // Handle page change
  const handlePageChange = (event, page) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };
  
  return (
    <Box>
      {/* Search and Filter Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by QR code or notes"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Variety</InputLabel>
                <Select
                  name="variety"
                  value={filterVariety}
                  onChange={handleFilterChange}
                  label="Variety"
                >
                  <MenuItem value="">All</MenuItem>
                  {varieties.map((variety) => (
                    <MenuItem key={variety.id} value={variety.id}>
                      {variety.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Farm</InputLabel>
                <Select
                  name="farm"
                  value={filterFarm}
                  onChange={handleFilterChange}
                  label="Farm"
                >
                  <MenuItem value="">All</MenuItem>
                  {farms.map((farm) => (
                    <MenuItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filterStatus}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="reconciled">Reconciled</MenuItem>
                  <MenuItem value="damaged">Damaged</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={handleSortChange}
                  label="Sort By"
                  endAdornment={
                    <IconButton
                      size="small"
                      onClick={toggleSortOrder}
                      sx={{ mr: 1 }}
                    >
                      <SortIcon
                        fontSize="small"
                        sx={{
                          transform: sortOrder === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </IconButton>
                  }
                >
                  <MenuItem value="created_at">Date Created</MenuItem>
                  <MenuItem value="qr_code">QR Code</MenuItem>
                  <MenuItem value="weight">Weight</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  disabled={!filtersApplied}
                >
                  Clear
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<FilterIcon />}
                  onClick={applyFilters}
                  color="primary"
                >
                  Apply
                </Button>
                
                <IconButton onClick={toggleViewMode} title={viewMode === 'grid' ? 'List View' : 'Grid View'}>
                  {viewMode === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />}
                </IconButton>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {/* Active Filters */}
        {filtersApplied && (
          <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
            {searchTerm && (
              <Chip
                label={`Search: ${searchTerm}`}
                onDelete={() => setSearchTerm('')}
                size="small"
              />
            )}
            
            {filterVariety && (
              <Chip
                label={`Variety: ${varieties.find(v => v.id === filterVariety)?.name || filterVariety}`}
                onDelete={() => setFilterVariety('')}
                size="small"
              />
            )}
            
            {filterFarm && (
              <Chip
                label={`Farm: ${farms.find(f => f.id === filterFarm)?.name || filterFarm}`}
                onDelete={() => setFilterFarm('')}
                size="small"
              />
            )}
            
            {filterStatus && (
              <Chip
                label={`Status: ${filterStatus}`}
                onDelete={() => setFilterStatus('')}
                size="small"
              />
            )}
            
            <Chip
              label={`Sort: ${sortBy.replace('_', ' ')} (${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
              size="small"
            />
          </Box>
        )}
      </Paper>
      
      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      {/* No Results Message */}
      {!loading && crates.length === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          py={6}
          textAlign="center"
        >
          <QrCodeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No crates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filtersApplied
              ? 'Try adjusting your filters to see more results'
              : 'No crates have been created yet'}
          </Typography>
        </Box>
      )}
      
      {/* Crate List */}
      {!loading && crates.length > 0 && (
        <>
          <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" component="div">
              Showing {crates.length} of {totalItems} crates (page {currentPage} of {totalPages})
            </Typography>
          </Box>
          
          <Grid container spacing={viewMode === 'grid' ? 2 : 0}>
            {crates.map((crate) => (
              <Grid
                item
                xs={12}
                md={viewMode === 'grid' ? 6 : 12}
                lg={viewMode === 'grid' ? 4 : 12}
                key={crate.id}
              >
                <CrateCard
                  crate={crate}
                  varieties={varieties}
                  farms={farms}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              </Grid>
            ))}
          </Grid>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                disabled={loading}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default CrateList;
