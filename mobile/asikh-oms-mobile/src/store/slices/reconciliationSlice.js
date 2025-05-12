// src/store/slices/reconciliationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import reconciliationService from '../../api/reconciliationService';

// Initial state
const initialState = {
  reconciliationStats: null,
  loading: false,
  error: null,
  success: false,
};

// Reconcile a crate with a batch
export const reconcileCrate = createAsyncThunk(
  'reconciliation/reconcileCrate',
  async ({ batchId, qrCode }, { rejectWithValue }) => {
    try {
      return await reconciliationService.reconcileCrate(batchId, qrCode);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to reconcile crate' }
      );
    }
  }
);

// Get reconciliation statistics for a batch
export const getReconciliationStats = createAsyncThunk(
  'reconciliation/getReconciliationStats',
  async (batchId, { rejectWithValue }) => {
    try {
      return await reconciliationService.getReconciliationStats(batchId);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch reconciliation statistics' }
      );
    }
  }
);

// Create the reconciliation slice
const reconciliationSlice = createSlice({
  name: 'reconciliation',
  initialState,
  reducers: {
    resetReconciliationState: (state) => {
      state.reconciliationStats = null;
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // reconcileCrate
      .addCase(reconcileCrate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(reconcileCrate.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // If we get reconciliation stats back, update them
        if (action.payload.reconciliation_stats) {
          state.reconciliationStats = action.payload.reconciliation_stats;
        }
      })
      .addCase(reconcileCrate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'An unknown error occurred' };
      })
      
      // getReconciliationStats
      .addCase(getReconciliationStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReconciliationStats.fulfilled, (state, action) => {
        state.loading = false;
        state.reconciliationStats = action.payload;
      })
      .addCase(getReconciliationStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'An unknown error occurred' };
      });
  },
});

export const { resetReconciliationState } = reconciliationSlice.actions;
export default reconciliationSlice.reducer;
