import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Get reconciliation status for a batch
export const getReconciliationStatus = createAsyncThunk(
  'reconciliation/getStatus',
  async (batchId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.BATCH_RECONCILIATION_STATUS(batchId)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to get reconciliation status';
      return rejectWithValue(message);
    }
  }
);

// Reconcile a crate
export const reconcileCrate = createAsyncThunk(
  'reconciliation/reconcileCrate',
  async ({ batchId, crateId, weight, photoFile }, { rejectWithValue }) => {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('weight', weight);
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      
      const response = await axios.post(
        `${API_URL}${ENDPOINTS.BATCH_RECONCILE_CRATE(batchId)}`,
        {
          qr_code: crateId,
          weight: weight,
          photo_base64: photoFile ? await convertFileToBase64(photoFile) : null
        }
      );
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reconcile crate';
      return rejectWithValue(message);
    }
  }
);

// Helper function to convert file to base64
const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., 'data:image/jpeg;base64,') and return only the base64 string
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Close a batch after reconciliation
export const closeBatch = createAsyncThunk(
  'reconciliation/closeBatch',
  async (batchId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.BATCH_CLOSE(batchId)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to close batch';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  status: null,
  batch: null,
  loading: false,
  error: null,
  reconciliationInProgress: false,
  closingBatch: false,
};

const reconciliationSlice = createSlice({
  name: 'reconciliation',
  initialState,
  reducers: {
    clearReconciliationState: (state) => {
      state.status = null;
      state.batch = null;
      state.error = null;
    },
    clearReconciliationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get reconciliation status
      .addCase(getReconciliationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReconciliationStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload.status;
        state.batch = action.payload.batch;
      })
      .addCase(getReconciliationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Reconcile crate
      .addCase(reconcileCrate.pending, (state) => {
        state.reconciliationInProgress = true;
        state.error = null;
      })
      .addCase(reconcileCrate.fulfilled, (state, action) => {
        state.reconciliationInProgress = false;
        // Update the status with the new data
        if (state.status) {
          state.status.reconciled_crates = action.payload.reconciled_crates;
          state.status.total_crates = action.payload.total_crates;
        }
        // Update the batch with the new data if it exists
        if (state.batch) {
          const crateIndex = state.batch.crates.findIndex(
            (crate) => crate.id === action.payload.crate_id
          );
          if (crateIndex !== -1) {
            state.batch.crates[crateIndex].reconciled = true;
            state.batch.crates[crateIndex].reconciled_weight = action.payload.weight;
            state.batch.crates[crateIndex].weight_differential = 
              state.batch.crates[crateIndex].weight - action.payload.weight;
          }
        }
        toast.success('Crate reconciled successfully');
      })
      .addCase(reconcileCrate.rejected, (state, action) => {
        state.reconciliationInProgress = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      
      // Close batch
      .addCase(closeBatch.pending, (state) => {
        state.closingBatch = true;
        state.error = null;
      })
      .addCase(closeBatch.fulfilled, (state, action) => {
        state.closingBatch = false;
        // Update the batch status
        if (state.batch) {
          state.batch.status = 'CLOSED';
        }
        toast.success('Batch closed successfully');
      })
      .addCase(closeBatch.rejected, (state, action) => {
        state.closingBatch = false;
        state.error = action.payload;
        toast.error(action.payload);
      });
  },
});

export const { clearReconciliationState, clearReconciliationError } = reconciliationSlice.actions;
export default reconciliationSlice.reducer;
