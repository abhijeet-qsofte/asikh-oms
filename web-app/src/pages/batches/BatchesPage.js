import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  LocalShipping as BatchIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL, ENDPOINTS } from '../../constants/api';
import BatchCard from '../../components/batches/BatchCard';

const BatchesPage = () => {
  const navigate = useNavigate();
  
  const [batches, setBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farms, setFarms] = useState([]);
  const [packhouses, setPackhouses] = useState([]);
  const [varieties, setVarieties] = useState([]);
  
  // Filter states
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    farm_id: '',
    packhouse_id: '',
    variety_id: '',
    created_date: null,
    departed_date: null,
    arrived_date: null,
    search: '',
  });
  
  // Fetch batches and filter options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch batches
        const batchesResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCHES}`);
        const batchesData = batchesResponse.data.batches || [];
        
        // Fetch farms for filter
        const farmsResponse = await axios.get(`${API_URL}${ENDPOINTS.FARMS}`);
        const farmsData = farmsResponse.data.farms || [];
        
        // Fetch packhouses for filter
        const packhousesResponse = await axios.get(`${API_URL}${ENDPOINTS.PACKHOUSES}`);
        const packhousesData = packhousesResponse.data.packhouses || [];
        
        // Fetch varieties for filter
        const varietiesResponse = await axios.get(`${API_URL}${ENDPOINTS.VARIETIES}`);
        const varietiesData = varietiesResponse.data.varieties || [];
        
        // Create a map of farms and packhouses for easy lookup
        const farmMap = {};
        farmsData.forEach(farm => {
          farmMap[farm.id] = farm;
        });
        
        const packhouseMap = {};
        packhousesData.forEach(packhouse => {
          packhouseMap[packhouse.id] = packhouse;
        });
        
        // Fetch weight details and crates for each batch and enhance batch data
        const batchesWithDetails = await Promise.all(
          batchesData.map(async (batch) => {
            try {
              // Fetch weight details
              const weightResponse = await axios.get(
                `${API_URL}${ENDPOINTS.BATCH_WEIGHT_DETAILS(batch.id)}`
              );
              
              // Fetch crates in the batch
              console.log(`Fetching crates for batch ${batch.id} from: ${API_URL}${ENDPOINTS.BATCH_CRATES(batch.id)}`);
              let cratesData = [];
              try {
                const cratesResponse = await axios.get(
                  `${API_URL}${ENDPOINTS.BATCH_CRATES(batch.id)}`
                );
                console.log('Crates response:', cratesResponse.data);
                
                // Extract crates from the response
                if (cratesResponse.data && Array.isArray(cratesResponse.data.crates)) {
                  cratesData = cratesResponse.data.crates;
                }
              } catch (cratesError) {
                console.error(`Error fetching crates for batch ${batch.id}:`, cratesError);
              }
              
              // Enhance batch with farm, packhouse, and crates objects
              const enhancedBatch = {
                ...batch,
                weight_details: weightResponse.data,
                // Add crates data that we fetched above
                crates: cratesData,
                // Add farm object if farm_id exists
                farm: batch.farm_id && farmMap[batch.farm_id] ? farmMap[batch.farm_id] : null,
                // Add packhouse object if packhouse_id exists
                packhouse: batch.packhouse_id && packhouseMap[batch.packhouse_id] ? packhouseMap[batch.packhouse_id] : null,
                // Make sure farm_name is set
                farm_name: batch.farm_name || (batch.farm_id && farmMap[batch.farm_id] ? farmMap[batch.farm_id].name : null),
                // Make sure packhouse_name is set
                packhouse_name: batch.packhouse_name || (batch.packhouse_id && packhouseMap[batch.packhouse_id] ? packhouseMap[batch.packhouse_id].name : null),
              };
              
              console.log('Enhanced batch with crates:', enhancedBatch);
              return enhancedBatch;
            } catch (error) {
              console.error(`Error fetching details for batch ${batch.id}:`, error);
              return {
                ...batch,
                weight_details: null,
                // Add farm object if farm_id exists
                farm: batch.farm_id && farmMap[batch.farm_id] ? farmMap[batch.farm_id] : null,
                // Add packhouse object if packhouse_id exists
                packhouse: batch.packhouse_id && packhouseMap[batch.packhouse_id] ? packhouseMap[batch.packhouse_id] : null,
                // Make sure farm_name is set
                farm_name: batch.farm_name || (batch.farm_id && farmMap[batch.farm_id] ? farmMap[batch.farm_id].name : null),
                // Make sure packhouse_name is set
                packhouse_name: batch.packhouse_name || (batch.packhouse_id && packhouseMap[batch.packhouse_id] ? packhouseMap[batch.packhouse_id].name : null),
              };
            }
          })
        );
        
        setBatches(batchesWithDetails);
        setFilteredBatches(batchesWithDetails);
        setFarms(farmsData);
        setPackhouses(packhousesData);
        setVarieties(varietiesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching batches:', error);
        setError('Failed to load batches');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Apply filters when filters state changes
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...batches];
      
      // Filter by status
      if (filters.status) {
        filtered = filtered.filter(batch => batch.status === filters.status);
      }
      
      // Filter by farm
      if (filters.farm_id) {
        filtered = filtered.filter(batch => batch.farm_id === parseInt(filters.farm_id));
      }
      
      // Filter by packhouse
      if (filters.packhouse_id) {
        filtered = filtered.filter(batch => batch.packhouse_id === parseInt(filters.packhouse_id));
      }
      
      // Filter by variety
      if (filters.variety_id) {
        filtered = filtered.filter(batch => {
          // Check if any crate in the batch has the selected variety
          return batch.crates && batch.crates.some(crate => 
            crate.variety_id === parseInt(filters.variety_id)
          );
        });
      }
      
      // Filter by created date
      if (filters.created_date) {
        const createdDate = format(filters.created_date, 'yyyy-MM-dd');
        filtered = filtered.filter(batch => {
          const batchDate = batch.created_at.split('T')[0];
          return batchDate === createdDate;
        });
      }
      
      // Filter by departed date
      if (filters.departed_date) {
        const departedDate = format(filters.departed_date, 'yyyy-MM-dd');
        filtered = filtered.filter(batch => {
          if (!batch.departed_at) return false;
          const batchDate = batch.departed_at.split('T')[0];
          return batchDate === departedDate;
        });
      }
      
      // Filter by arrived date
      if (filters.arrived_date) {
        const arrivedDate = format(filters.arrived_date, 'yyyy-MM-dd');
        filtered = filtered.filter(batch => {
          if (!batch.arrived_at) return false;
          const batchDate = batch.arrived_at.split('T')[0];
          return batchDate === arrivedDate;
        });
      }
      
      // Filter by search term (batch code or notes)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(batch => 
          (batch.batch_code && batch.batch_code.toString().includes(searchTerm)) || 
          (batch.notes && batch.notes.toLowerCase().includes(searchTerm))
        );
      }
      
      setFilteredBatches(filtered);
    };
    
    applyFilters();
  }, [filters, batches]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };
  
  const handleDateChange = (name, date) => {
    setFilters({
      ...filters,
      [name]: date,
    });
  };
  
  const clearFilters = () => {
    setFilters({
      status: '',
      farm_id: '',
      packhouse_id: '',
      variety_id: '',
      created_date: null,
      departed_date: null,
      arrived_date: null,
      search: '',
    });
  };
  
  const refreshBatches = async () => {
    try {
      setLoading(true);
      
      // Fetch batches
      const batchesResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCHES}`);
      const batchesData = batchesResponse.data.batches || [];
      
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
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing batches:', error);
      setError('Failed to refresh batches');
      setLoading(false);
    }
  };
  
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.farm_id) count++;
    if (filters.packhouse_id) count++;
    if (filters.variety_id) count++;
    if (filters.created_date) count++;
    if (filters.departed_date) count++;
    if (filters.arrived_date) count++;
    if (filters.search) count++;
    return count;
  };
  
  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Batches
          </Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton onClick={refreshBatches} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/batches/create')}
              sx={{ ml: 1 }}
            >
              New Batch
            </Button>
          </Box>
        </Box>
        
        {/* Search and Filter Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search batches"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by batch code or notes"
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterIcon />}
                    onClick={() => setFilterDialogOpen(true)}
                    color={activeFiltersCount > 0 ? 'primary' : 'inherit'}
                  >
                    Filters
                    {activeFiltersCount > 0 && (
                      <Chip
                        label={activeFiltersCount}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Button>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<ClearIcon />}
                      onClick={clearFilters}
                    >
                      Clear
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
      
      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Filter Batches</Typography>
            <IconButton onClick={() => setFilterDialogOpen(false)}>
              <ClearIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                    <MenuItem value="ARRIVED">Arrived</MenuItem>
                    <MenuItem value="RECONCILED">Reconciled</MenuItem>
                    <MenuItem value="CLOSED">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Farm</InputLabel>
                  <Select
                    name="farm_id"
                    value={filters.farm_id}
                    onChange={handleFilterChange}
                    label="Farm"
                  >
                    <MenuItem value="">All</MenuItem>
                    {farms.map((farm) => (
                      <MenuItem key={farm.id} value={farm.id.toString()}>
                        {farm.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Packhouse</InputLabel>
                  <Select
                    name="packhouse_id"
                    value={filters.packhouse_id}
                    onChange={handleFilterChange}
                    label="Packhouse"
                  >
                    <MenuItem value="">All</MenuItem>
                    {packhouses.map((packhouse) => (
                      <MenuItem key={packhouse.id} value={packhouse.id.toString()}>
                        {packhouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Variety</InputLabel>
                  <Select
                    name="variety_id"
                    value={filters.variety_id}
                    onChange={handleFilterChange}
                    label="Variety"
                  >
                    <MenuItem value="">All</MenuItem>
                    {varieties.map((variety) => (
                      <MenuItem key={variety.id} value={variety.id.toString()}>
                        {variety.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Date Filters
                  </Typography>
                </Divider>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Created Date"
                  value={filters.created_date}
                  onChange={(date) => handleDateChange('created_date', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Departed Date"
                  value={filters.departed_date}
                  onChange={(date) => handleDateChange('departed_date', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Arrived Date"
                  value={filters.arrived_date}
                  onChange={(date) => handleDateChange('arrived_date', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearFilters} color="inherit">
            Clear All
          </Button>
          <Button
            onClick={() => setFilterDialogOpen(false)}
            variant="contained"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Batches List */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Typography color="error">{error}</Typography>
        </Box>
      ) : filteredBatches.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          sx={{ textAlign: 'center' }}
        >
          <BatchIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No batches found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {activeFiltersCount > 0
              ? 'Try adjusting your filters or clear them to see all batches'
              : 'Create your first batch to get started'}
          </Typography>
          {activeFiltersCount > 0 ? (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/batches/create')}
            >
              Create Batch
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredBatches.map((batch) => (
            <Grid item xs={12} sm={6} md={4} key={batch.id}>
              <BatchCard
                batch={batch}
                onClick={() => navigate(`/batches/${batch.id}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default BatchesPage;
