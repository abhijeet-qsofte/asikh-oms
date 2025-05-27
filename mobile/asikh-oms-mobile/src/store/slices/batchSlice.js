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
      // Add the correct admin supervisor ID if not provided
      // This is the actual admin user ID from the database
      const batchDataWithSupervisor = {
        ...batchData,
        // Use the actual admin ID from the system
        supervisor_id: batchData.supervisor_id || '16bdea6d-7845-4c40-82f5-07a38103eba7'
      };
      
      console.log('Creating batch with data (including supervisor):', JSON.stringify(batchDataWithSupervisor, null, 2));
      
      return await batchService.createBatch(batchDataWithSupervisor);
    } catch (error) {
      // Check if the error is about supervisor not found
      if (error.response?.data?.detail && 
          typeof error.response.data.detail === 'string' && 
          error.response.data.detail.includes('Supervisor with ID')) {
        
        console.log('Supervisor ID error detected, trying with admin ID');
        
        // Try again with the admin ID (in case the user provided an invalid ID)
        try {
          const alternativeBatchData = {
            ...batchData,
            supervisor_id: '16bdea6d-7845-4c40-82f5-07a38103eba7' // Admin user ID
          };
          
          return await batchService.createBatch(alternativeBatchData);
        } catch (retryError) {
          return rejectWithValue({ 
            message: 'Failed to create batch with admin supervisor ID. Please contact system administrator.'
          });
        }
      }
      
      // Handle other types of errors
      let errorMessage = 'Failed to create batch';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          if (Array.isArray(error.response.data.detail)) {
            // Format validation errors
            const fieldErrors = error.response.data.detail.map(err => {
              const field = err.loc ? err.loc[err.loc.length - 1] : 'unknown field';
              return `${field} - ${err.msg}`;
            });
            errorMessage = 'Validation error: ' + fieldErrors.join(', ');
          } else {
            errorMessage = error.response.data.detail || 
                          error.response.data.message || 
                          JSON.stringify(error.response.data);
          }
        } else {
          errorMessage = String(error.response.data);
        }
      }
      
      return rejectWithValue({ message: errorMessage });
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
      console.log(`Fetching batch with ID: ${batchId}`);
      const result = await batchService.getBatchById(batchId);
      console.log(`Successfully fetched batch: ${batchId}`);
      return result;
    } catch (error) {
      console.error(`Error fetching batch ${batchId}:`, error);
      // Check if this is an auth error
      if (error.isAuthError || 
          error.message?.includes('Authentication') || 
          error.response?.status === 401) {
        // Add a flag to identify auth errors
        return rejectWithValue({
          message: 'Authentication required',
          isAuthError: true
        });
      }
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
      // Ensure we're returning a string message for the error
      let errorMessage = 'Failed to add crate to batch';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = error.response.data.detail || 
                        error.response.data.message || 
                        JSON.stringify(error.response.data);
        } else {
          errorMessage = String(error.response.data);
        }
      }
      
      return rejectWithValue({ message: errorMessage });
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
      console.log(`Fetching stats for batch: ${batchId}`);
      const result = await batchService.getBatchStats(batchId);
      console.log(`Successfully fetched stats for batch: ${batchId}`);
      return result;
    } catch (error) {
      console.error(`Error fetching stats for batch ${batchId}:`, error);
      // Check if this is an auth error
      if (error.isAuthError || 
          error.message?.includes('Authentication') || 
          error.response?.status === 401) {
        // Add a flag to identify auth errors
        return rejectWithValue({
          message: 'Authentication required',
          isAuthError: true
        });
      }
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
      console.log(`Fetching reconciliation status for batch: ${batchId}`);
      const result = await batchService.getReconciliationStatus(batchId);
      console.log(`Successfully fetched reconciliation status for batch: ${batchId}`);
      return result;
    } catch (error) {
      console.error(`Error getting reconciliation status for batch ${batchId}:`, error);
      // Check if this is an auth error
      if (error.isAuthError || 
          error.message?.includes('Authentication') || 
          error.response?.status === 401) {
        // Add a flag to identify auth errors
        return rejectWithValue({
          message: 'Authentication required',
          isAuthError: true
        });
      }
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
