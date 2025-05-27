// src/store/slices/crateSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import imageService from '../../services/imageService';

// Async thunk for creating a new crate with optimized image handling
export const createCrate = createAsyncThunk(
  'crates/create',
  async (crateData, { rejectWithValue }) => {
    try {
      // Extract image data if present, but keep supervisor_id
      const { photo_base64, ...crateDataWithoutImage } = crateData;
      
      // Make sure supervisor_id is included
      if (!crateDataWithoutImage.supervisor_id) {
        console.error('supervisor_id is missing in crate data');
        return rejectWithValue({ message: 'supervisor_id is required' });
      }
      
      // First create the crate without the image (faster request)
      console.log('Creating crate without image first...');
      const response = await apiClient.post('/api/crates', crateDataWithoutImage);
      const newCrate = response.data;
      
      // If we have an image, upload it in a separate request using the image service
      if (photo_base64 && newCrate.id) {
        try {
          console.log('Uploading image separately for crate:', newCrate.id);
          const uploadResult = await imageService.uploadCrateImage(newCrate.id, photo_base64);
          
          if (uploadResult.success) {
            console.log('Image upload completed successfully');
          } else {
            console.error('Image upload failed:', uploadResult.error);
          }
        } catch (imageError) {
          console.error('Failed to upload image, but crate was created:', imageError);
          // We don't reject here because the crate was created successfully
        }
      }
      
      return newCrate;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create crate' }
      );
    }
  }
);

// Async thunk for fetching crates
export const fetchCrates = createAsyncThunk(
  'crates/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/crates', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch crates' }
      );
    }
  }
);

// Async thunk for fetching a single crate by ID
export const fetchCrateById = createAsyncThunk(
  'crates/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/crates/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch crate' }
      );
    }
  }
);

// Async thunk for fetching a crate by QR code
export const fetchCrateByQR = createAsyncThunk(
  'crates/fetchByQR',
  async (qrCode, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/crates/qr/${qrCode}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch crate by QR code' }
      );
    }
  }
);

// Async thunk for updating a crate
export const updateCrate = createAsyncThunk(
  'crates/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/api/crates/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update crate' }
      );
    }
  }
);

// Async thunk for assigning a crate to a batch
export const assignCrateToBatch = createAsyncThunk(
  'crates/assignToBatch',
  async ({ qrCode, batchId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/crates/batch-assign', {
        qr_code: qrCode,
        batch_id: batchId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to assign crate to batch' }
      );
    }
  }
);

const crateSlice = createSlice({
  name: 'crates',
  initialState: {
    crates: [],
    currentCrate: null,
    loading: false,
    error: null,
    pagination: {
      total: 0,
      page: 1,
      pageSize: 20,
    },
  },
  reducers: {
    clearCrateError: (state) => {
      state.error = null;
    },
    clearCurrentCrate: (state) => {
      state.currentCrate = null;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create crate
      .addCase(createCrate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCrate.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCrate = action.payload;
        // Add to the beginning of the crates array if it's loaded
        if (state.crates.length > 0) {
          state.crates.unshift(action.payload);
        }
      })
      .addCase(createCrate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to create crate' };
      })

      // Fetch crates
      .addCase(fetchCrates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCrates.fulfilled, (state, action) => {
        state.loading = false;
        state.crates = action.payload.crates;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          pageSize: action.payload.page_size,
        };
      })
      .addCase(fetchCrates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to fetch crates' };
      })

      // Fetch crate by ID
      .addCase(fetchCrateById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCrateById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCrate = action.payload;
      })
      .addCase(fetchCrateById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to fetch crate' };
      })

      // Fetch crate by QR
      .addCase(fetchCrateByQR.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCrateByQR.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCrate = action.payload;
      })
      .addCase(fetchCrateByQR.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || {
          message: 'Failed to fetch crate by QR code',
        };
      })

      // Update crate
      .addCase(updateCrate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCrate.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCrate = action.payload;
        // Update in the crates array if it exists
        const index = state.crates.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.crates[index] = action.payload;
        }
      })
      .addCase(updateCrate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to update crate' };
      })

      // Assign crate to batch
      .addCase(assignCrateToBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignCrateToBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCrate = action.payload;
        // Update in the crates array if it exists
        const index = state.crates.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.crates[index] = action.payload;
        }
      })
      .addCase(assignCrateToBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || {
          message: 'Failed to assign crate to batch',
        };
      });
  },
});

export const { clearCrateError, clearCurrentCrate, setPage } =
  crateSlice.actions;
export default crateSlice.reducer;
