import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Get all crates
export const getCrates = createAsyncThunk(
  'crates/getCrates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.CRATES}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch crates';
      return rejectWithValue(message);
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
  async ({ id, crateData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.CRATE_DETAIL(id)}`, crateData);
      return response.data;
    } catch (error) {
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
  crates: [],
  currentCrate: null,
  batchCrates: {},
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
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
