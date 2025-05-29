import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Get all batches
export const getBatches = createAsyncThunk(
  'batches/getBatches',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCHES}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch batches';
      return rejectWithValue(message);
    }
  }
);

// Get batch by ID
export const getBatchById = createAsyncThunk(
  'batches/getBatchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch batch details';
      return rejectWithValue(message);
    }
  }
);

// Create new batch
export const createBatch = createAsyncThunk(
  'batches/createBatch',
  async (batchData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCHES}`, batchData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create batch';
      return rejectWithValue(message);
    }
  }
);

// Add crate to batch
export const addCrateToBatch = createAsyncThunk(
  'batches/addCrateToBatch',
  async ({ batchId, crateData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_ADD_CRATE(batchId)}`, crateData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add crate to batch';
      return rejectWithValue(message);
    }
  }
);

// Update batch status
export const updateBatchStatus = createAsyncThunk(
  'batches/updateBatchStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.BATCH_DETAIL(id)}/status`, { status });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update batch status';
      return rejectWithValue(message);
    }
  }
);

// Get batch weight details
export const getBatchWeightDetails = createAsyncThunk(
  'batches/getBatchWeightDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_WEIGHT_DETAILS(id)}`);
      return { id, weightDetails: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch weight details';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  batches: [],
  currentBatch: null,
  weightDetails: {},
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
};

const batchSlice = createSlice({
  name: 'batches',
  initialState,
  reducers: {
    clearBatchErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
    },
    clearCurrentBatch: (state) => {
      state.currentBatch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all batches
      .addCase(getBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatches.fulfilled, (state, action) => {
        state.loading = false;
        // Extract batches array from the paginated response
        state.batches = action.payload.batches || [];
      })
      .addCase(getBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Get batch by ID
      .addCase(getBatchById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatchById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBatch = action.payload;
      })
      .addCase(getBatchById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Create new batch
      .addCase(createBatch.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createBatch.fulfilled, (state, action) => {
        state.createLoading = false;
        state.batches.push(action.payload);
        state.currentBatch = action.payload;
        toast.success('Batch created successfully');
      })
      .addCase(createBatch.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload;
        toast.error(action.payload);
      })
      
      // Update batch status
      .addCase(updateBatchStatus.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateBatchStatus.fulfilled, (state, action) => {
        state.updateLoading = false;
        
        // Update in batches array
        const index = state.batches.findIndex((batch) => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
        
        // Update current batch if it's the same
        if (state.currentBatch && state.currentBatch.id === action.payload.id) {
          state.currentBatch = action.payload;
        }
        
        toast.success(`Batch status updated to ${action.payload.status}`);
      })
      .addCase(updateBatchStatus.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
        toast.error(action.payload);
      })
      
      // Get batch weight details
      .addCase(getBatchWeightDetails.fulfilled, (state, action) => {
        state.weightDetails[action.payload.id] = action.payload.weightDetails;
      })
      
      // Add crate to batch
      .addCase(addCrateToBatch.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(addCrateToBatch.fulfilled, (state, action) => {
        state.updateLoading = false;
        
        // Update current batch with the updated batch data
        if (state.currentBatch && state.currentBatch.id === action.payload.id) {
          state.currentBatch = action.payload;
        }
        
        // Update in batches array
        const index = state.batches.findIndex((batch) => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
        
        toast.success('Crate added to batch successfully');
      })
      .addCase(addCrateToBatch.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
        toast.error(action.payload);
      });
  },
});

export const { clearBatchErrors, clearCurrentBatch } = batchSlice.actions;
export default batchSlice.reducer;
