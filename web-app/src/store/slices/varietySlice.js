import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Get all varieties
export const getVarieties = createAsyncThunk(
  'varieties/getVarieties',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.VARIETIES}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch varieties';
      return rejectWithValue(message);
    }
  }
);

// Get variety by ID
export const getVarietyById = createAsyncThunk(
  'varieties/getVarietyById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.VARIETY_DETAIL(id)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch variety details';
      return rejectWithValue(message);
    }
  }
);

// Create new variety
export const createVariety = createAsyncThunk(
  'varieties/createVariety',
  async (varietyData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.VARIETIES}`, varietyData);
      toast.success('Variety created successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create variety';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update variety
export const updateVariety = createAsyncThunk(
  'varieties/updateVariety',
  async ({ id, varietyData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.VARIETY_DETAIL(id)}`, varietyData);
      toast.success('Variety updated successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update variety';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Delete variety
export const deleteVariety = createAsyncThunk(
  'varieties/deleteVariety',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.VARIETY_DETAIL(id)}`);
      toast.success('Variety deleted successfully');
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete variety';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const varietySlice = createSlice({
  name: 'varieties',
  initialState: {
    varieties: [],
    variety: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearVarietyErrors: (state) => {
      state.error = null;
    },
    clearCurrentVariety: (state) => {
      state.variety = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get varieties
      .addCase(getVarieties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVarieties.fulfilled, (state, action) => {
        state.loading = false;
        state.varieties = action.payload.varieties || [];
      })
      .addCase(getVarieties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get variety by ID
      .addCase(getVarietyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVarietyById.fulfilled, (state, action) => {
        state.loading = false;
        state.variety = action.payload;
      })
      .addCase(getVarietyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create variety
      .addCase(createVariety.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVariety.fulfilled, (state, action) => {
        state.loading = false;
        state.varieties.push(action.payload);
      })
      .addCase(createVariety.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update variety
      .addCase(updateVariety.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVariety.fulfilled, (state, action) => {
        state.loading = false;
        state.varieties = state.varieties.map((variety) =>
          variety.id === action.payload.id ? action.payload : variety
        );
        state.variety = action.payload;
      })
      .addCase(updateVariety.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete variety
      .addCase(deleteVariety.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVariety.fulfilled, (state, action) => {
        state.loading = false;
        state.varieties = state.varieties.filter((variety) => variety.id !== action.payload);
      })
      .addCase(deleteVariety.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearVarietyErrors, clearCurrentVariety } = varietySlice.actions;
export default varietySlice.reducer;
