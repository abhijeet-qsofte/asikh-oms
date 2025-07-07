import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Get all crates - using a simplified approach that works with the API limitations
export const getCrates = createAsyncThunk(
  'crates/getCrates',
  async (params = {}, { rejectWithValue, getState }) => {
    try {
      // Check if we already have all crates in the state
      const { allCrates } = getState().crates;
      let cratesData = [];
      let total = 0;
      
      // Only fetch from API if we don't have crates or if filters are applied
      if (allCrates.length === 0 || Object.keys(params).some(key => key !== 'page' && key !== 'page_size')) {
        // We'll fetch all crates at once and handle pagination client-side
        // This is the most reliable approach with the current API
        const response = await axios.get(`${API_URL}${ENDPOINTS.CRATES}`);
        
        if (!response.data || !response.data.crates) {
          return rejectWithValue('Invalid response format from server');
        }
        
        cratesData = response.data.crates || [];
        total = response.data.total || cratesData.length;
      } else {
        // Use existing crates data from state
        cratesData = allCrates;
        total = allCrates.length;
      }
      
      const pageSize = params.page_size || 20;
      const requestedPage = params.page || 1;
      
      // Calculate start and end indices for the requested page
      const startIndex = (requestedPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, cratesData.length);
      
      // Get crates for the requested page
      const paginatedCrates = cratesData.slice(startIndex, endIndex);
      
      // Add debugging logs
      console.log(`Pagination debug: Page ${requestedPage}, Size ${pageSize}, Total ${total}`);
      console.log(`Slice indices: ${startIndex} to ${endIndex}`);
      console.log(`Total crates: ${cratesData.length}, Page crates: ${paginatedCrates.length}`);
      
      return {
        allCrates: cratesData,  // All crates for client-side pagination
        crates: paginatedCrates, // Current page of crates
        page: requestedPage,
        page_size: pageSize,
        total: total
      };
    } catch (error) {
      console.error('Error fetching crates:', error);
      let errorMessage = 'Failed to fetch crates';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = error.response.data?.detail || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Get crates by batch ID
export const getCratesByBatchId = createAsyncThunk(
  'crates/getCratesByBatchId',
  async (batchId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_CRATES(batchId)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch crates for batch';
      return rejectWithValue(message);
    }
  }
);

// Get crate by ID
export const getCrateById = createAsyncThunk(
  'crates/getCrateById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATE_DETAIL(id)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch crate details';
      return rejectWithValue(message);
    }
  }
);

// Create new crate
export const createCrate = createAsyncThunk(
  'crates/createCrate',
  async (crateData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.CRATES}`, crateData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create crate';
      return rejectWithValue(message);
    }
  }
);

// Update crate
export const updateCrate = createAsyncThunk(
  'crates/updateCrate',
  async (updateData, { rejectWithValue }) => {
    try {
      // Handle both formats: either {id, crateData} or just the crate object with id
      const id = updateData.id;
      const crateData = updateData.crateData || updateData;
      
      console.log('Updating crate with ID:', id);
      console.log('Crate data being sent:', crateData);
      
      const response = await axios.put(`${API_URL}${ENDPOINTS.CRATE_DETAIL(id)}`, crateData);
      return response.data;
    } catch (error) {
      console.error('Error updating crate:', error);
      const message = error.response?.data?.detail || 'Failed to update crate';
      return rejectWithValue(message);
    }
  }
);

// Delete crate
export const deleteCrate = createAsyncThunk(
  'crates/deleteCrate',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.CRATE_DETAIL(id)}`);
      toast.success('Crate deleted successfully');
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete crate';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update crate weight
export const updateCrateWeight = createAsyncThunk(
  'crates/updateCrateWeight',
  async ({ id, weight, imageUrl }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.CRATE_WEIGHT(id)}`, { 
        weight, 
        image_url: imageUrl 
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update crate weight';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  crates: [],         // Current page of crates
  allCrates: [],      // All crates for client-side pagination
  currentCrate: null,
  batchCrates: {},
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1
  },
};

const crateSlice = createSlice({
  name: 'crates',
  initialState,
  reducers: {
    clearCrateErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
    },
    clearCurrentCrate: (state) => {
      state.currentCrate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all crates
      .addCase(getCrates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCrates.fulfilled, (state, action) => {
        state.loading = false;
        state.crates = action.payload.crates || [];
        state.allCrates = action.payload.allCrates || [];
        
        // Get values from payload
        const total = action.payload.total || 0;
        const pageSize = action.payload.page_size || 20;
        
        // Calculate total pages based on total items and page size
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        
        // Update pagination information
        state.pagination = {
          page: action.payload.page || 1,
          page_size: pageSize,
          total: total,
          total_pages: totalPages
        };
      })
      .addCase(getCrates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Get crates by batch ID
      .addCase(getCratesByBatchId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCratesByBatchId.fulfilled, (state, action) => {
        state.loading = false;
        // Store crates by batch ID for easy access
        state.batchCrates[action.meta.arg] = action.payload;
      })
      .addCase(getCratesByBatchId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Get crate by ID
      .addCase(getCrateById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCrateById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCrate = action.payload;
      })
      .addCase(getCrateById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Create new crate
      .addCase(createCrate.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createCrate.fulfilled, (state, action) => {
        state.createLoading = false;
        state.crates.push(action.payload);
        
        // Add to batch crates if batch ID exists
        if (action.payload.batch_id && state.batchCrates[action.payload.batch_id]) {
          state.batchCrates[action.payload.batch_id].push(action.payload);
        }
        
        state.currentCrate = action.payload;
        toast.success('Crate created successfully');
      })
      .addCase(createCrate.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload;
        toast.error(action.payload);
      })
      
      // Update crate
      .addCase(updateCrate.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateCrate.fulfilled, (state, action) => {
        state.updateLoading = false;
        
        // Update in crates array
        const index = state.crates.findIndex((crate) => crate.id === action.payload.id);
        if (index !== -1) {
          state.crates[index] = action.payload;
        }
        
        // Update in batch crates if it exists
        if (action.payload.batch_id && state.batchCrates[action.payload.batch_id]) {
          const batchIndex = state.batchCrates[action.payload.batch_id].findIndex(
            (crate) => crate.id === action.payload.id
          );
          if (batchIndex !== -1) {
            state.batchCrates[action.payload.batch_id][batchIndex] = action.payload;
          }
        }
        
        // Update current crate if it's the same
        if (state.currentCrate && state.currentCrate.id === action.payload.id) {
          state.currentCrate = action.payload;
        }
        
        toast.success('Crate updated successfully');
      })
      .addCase(updateCrate.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
        toast.error(action.payload);
      })
      
      // Update crate weight
      .addCase(updateCrateWeight.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateCrateWeight.fulfilled, (state, action) => {
        state.updateLoading = false;
        
        // Update in crates array
        const index = state.crates.findIndex((crate) => crate.id === action.payload.id);
        if (index !== -1) {
          state.crates[index] = action.payload;
        }
        
        // Update in batch crates if it exists
        if (action.payload.batch_id && state.batchCrates[action.payload.batch_id]) {
          const batchIndex = state.batchCrates[action.payload.batch_id].findIndex(
            (crate) => crate.id === action.payload.id
          );
          if (batchIndex !== -1) {
            state.batchCrates[action.payload.batch_id][batchIndex] = action.payload;
          }
        }
        
        // Update current crate if it's the same
        if (state.currentCrate && state.currentCrate.id === action.payload.id) {
          state.currentCrate = action.payload;
        }
        
        toast.success('Crate weight updated successfully');
      })
      .addCase(updateCrateWeight.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
        toast.error(action.payload);
      })
      
      // Delete crate
      .addCase(deleteCrate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCrate.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove from crates array
        state.crates = state.crates.filter((crate) => crate.id !== action.payload);
        
        // Remove from batch crates if it exists
        Object.keys(state.batchCrates).forEach((batchId) => {
          state.batchCrates[batchId] = state.batchCrates[batchId].filter(
            (crate) => crate.id !== action.payload
          );
        });
        
        // Clear current crate if it's the same
        if (state.currentCrate && state.currentCrate.id === action.payload) {
          state.currentCrate = null;
        }
      })
      .addCase(deleteCrate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      });
  },
});

export const { clearCrateErrors, clearCurrentCrate } = crateSlice.actions;
export default crateSlice.reducer;
