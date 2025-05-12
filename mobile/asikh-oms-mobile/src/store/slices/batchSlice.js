// src/store/slices/batchSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import batchService from '../../api/batchService';

// Initial state
const initialState = {
  batches: [],
  currentBatch: null,
  batchCrates: [],
  batchStats: null,
  loading: false,
  error: null,
  success: false,
  weightDetails: {}, // Store weight details for each batch by ID
  pagination: {
    total: 0,
    page: 1,
    pageSize: 20
  }
};

// Create a new batch
export const createBatch = createAsyncThunk(
  'batches/create',
  async (batchData, { rejectWithValue }) => {
    try {
      return await batchService.createBatch(batchData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create batch' }
      );
    }
  }
);

// Get all batches
export const getBatches = createAsyncThunk(
  'batches/getAll',
  async (params, { rejectWithValue }) => {
    console.log('getBatches thunk called with params:', params);
    try {
      console.log('Calling batchService.getBatches...');
      const result = await batchService.getBatches(params);
      console.log('batchService.getBatches result:', result);
      return result;
    } catch (error) {
      console.error('getBatches error in thunk:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch batches' }
      );
    }
  }
);

// Get batch by ID
export const getBatchById = createAsyncThunk(
  'batches/getById',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.getBatchById(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch batch' }
      );
    }
  }
);

// Get batch by code
export const getBatchByCode = createAsyncThunk(
  'batches/getByCode',
  async (batchCode, { rejectWithValue }) => {
    try {
      return await batchService.getBatchByCode(batchCode);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch batch' }
      );
    }
  }
);

// Add crate to batch
export const addCrateToBatch = createAsyncThunk(
  'batches/addCrate',
  async ({ batchId, qrCode }, { rejectWithValue }) => {
    try {
      return await batchService.addCrateToBatch(batchId, qrCode);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to add crate to batch' }
      );
    }
  }
);

// Get crates in a batch
export const getBatchCrates = createAsyncThunk(
  'batches/getCrates',
  async ({ batchId, params }, { rejectWithValue }) => {
    try {
      return await batchService.getBatchCrates(batchId, params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch batch crates' }
      );
    }
  }
);

// Get batch statistics
export const getBatchStats = createAsyncThunk(
  'batches/getStats',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.getBatchStats(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch batch statistics' }
      );
    }
  }
);

// Update batch
export const updateBatch = createAsyncThunk(
  'batches/update',
  async ({ batchId, batchData }, { rejectWithValue }) => {
    try {
      return await batchService.updateBatch(batchId, batchData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update batch' }
      );
    }
  }
);

// Mark batch as departed
export const markBatchDeparted = createAsyncThunk(
  'batches/depart',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.markBatchDeparted(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to mark batch as departed' }
      );
    }
  }
);

// Mark batch as arrived
export const markBatchArrived = createAsyncThunk(
  'batches/arrive',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.markBatchArrived(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to mark batch as arrived' }
      );
    }
  }
);

// Close batch after reconciliation
export const closeBatch = createAsyncThunk(
  'batches/close',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.closeBatch(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to close batch' }
      );
    }
  }
);

// Get reconciliation status for a batch
export const getReconciliationStatus = createAsyncThunk(
  'batches/getReconciliationStatus',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.getReconciliationStatus(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to get reconciliation status' }
      );
    }
  }
);

// Get detailed weight information for a batch
export const getBatchWeightDetails = createAsyncThunk(
  'batches/getWeightDetails',
  async (batchId, { rejectWithValue }) => {
    try {
      return await batchService.getBatchWeightDetails(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to get weight details' }
      );
    }
  }
);

// Set page for pagination
export const setPage = createAsyncThunk(
  'batches/setPage',
  async (page, { getState, dispatch }) => {
    return page;
  }
);

// Batch slice
const batchSlice = createSlice({
  name: 'batch',
  initialState,
  reducers: {
    resetBatchState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
    clearCurrentBatch: (state) => {
      state.currentBatch = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle getBatchWeightDetails
      .addCase(getBatchWeightDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatchWeightDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        
        // Store weight details by batch ID
        const batchId = action.payload.batch_id;
        state.weightDetails = {
          ...state.weightDetails,
          [batchId]: action.payload
        };
        
        // If we have a current batch, update its weight information
        if (state.currentBatch && state.currentBatch.id === batchId) {
          state.currentBatch = {
            ...state.currentBatch,
            total_original_weight: action.payload.total_original_weight,
            total_reconciled_weight: action.payload.total_reconciled_weight,
            total_weight_differential: action.payload.total_weight_differential,
            weight_loss_percentage: action.payload.weight_loss_percentage
          };
        }
        
        // Also update the batch in the batches array if it exists
        const batchIndex = state.batches.findIndex(batch => batch.id === batchId);
        if (batchIndex !== -1) {
          state.batches[batchIndex] = {
            ...state.batches[batchIndex],
            total_original_weight: action.payload.total_original_weight,
            total_reconciled_weight: action.payload.total_reconciled_weight,
            total_weight_differential: action.payload.total_weight_differential,
            weight_loss_percentage: action.payload.weight_loss_percentage
          };
        }
      })
      .addCase(getBatchWeightDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to get weight details' };
      })
      // Create batch
      .addCase(createBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentBatch = action.payload;
        state.batches.unshift(action.payload);
      })
      .addCase(createBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get all batches
      .addCase(getBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatches.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = action.payload.batches;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          pageSize: action.payload.page_size
        };
      })
      .addCase(getBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
      })
      
      // Get batch by code
      .addCase(getBatchByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatchByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBatch = action.payload;
      })
      .addCase(getBatchByCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add crate to batch
      .addCase(addCrateToBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCrateToBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // Update the current batch if it's the one we added to
        if (state.currentBatch && state.currentBatch.id === action.payload.batch_id) {
          state.currentBatch.total_crates += 1;
          state.currentBatch.total_weight += action.payload.weight || 0;
        }
      })
      .addCase(addCrateToBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get batch crates
      .addCase(getBatchCrates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatchCrates.fulfilled, (state, action) => {
        state.loading = false;
        state.batchCrates = action.payload.crates;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          pageSize: action.payload.page_size
        };
      })
      .addCase(getBatchCrates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get batch stats
      .addCase(getBatchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBatchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.batchStats = action.payload;
      })
      .addCase(getBatchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update batch
      .addCase(updateBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentBatch = action.payload;
        
        // Update in the batches list if present
        const index = state.batches.findIndex(batch => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
      })
      .addCase(updateBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Mark batch as departed
      .addCase(markBatchDeparted.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markBatchDeparted.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentBatch = action.payload;
        
        // Update in the batches list if present
        const index = state.batches.findIndex(batch => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
      })
      .addCase(markBatchDeparted.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Mark batch as arrived
      .addCase(markBatchArrived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markBatchArrived.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentBatch = action.payload;
        
        // Update in the batches list if present
        const index = state.batches.findIndex(batch => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
      })
      .addCase(markBatchArrived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'An unknown error occurred' };
      })
      
      // Close batch
      .addCase(closeBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(closeBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentBatch = action.payload;
        // Update the batch in the list
        const index = state.batches.findIndex(batch => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
      })
      .addCase(closeBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'An unknown error occurred' };
      })
      
      // Get reconciliation status
      .addCase(getReconciliationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReconciliationStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentBatch && state.currentBatch.id === action.payload.batch_id) {
          state.currentBatch.reconciliation_status = action.payload.reconciliation_status;
          state.currentBatch.is_fully_reconciled = action.payload.is_fully_reconciled;
        }
      })
      .addCase(getReconciliationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to get reconciliation status' };
      })
      
      // Set page
      .addCase(setPage.fulfilled, (state, action) => {
        state.pagination.page = action.payload;
      });
  }
});

export const { resetBatchState, clearCurrentBatch } = batchSlice.actions;
export default batchSlice.reducer;
