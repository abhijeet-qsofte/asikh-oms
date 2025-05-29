import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Get all farms
export const getFarms = createAsyncThunk(
  'farms/getFarms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.FARMS}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch farms';
      return rejectWithValue(message);
    }
  }
);

// Get farm by ID
export const getFarmById = createAsyncThunk(
  'farms/getFarmById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.FARM_DETAIL(id)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch farm details';
      return rejectWithValue(message);
    }
  }
);

// Create new farm
export const createFarm = createAsyncThunk(
  'farms/createFarm',
  async (farmData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.FARMS}`, farmData);
      toast.success('Farm created successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create farm';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update farm
export const updateFarm = createAsyncThunk(
  'farms/updateFarm',
  async ({ id, farmData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.FARM_DETAIL(id)}`, farmData);
      toast.success('Farm updated successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update farm';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Delete farm
export const deleteFarm = createAsyncThunk(
  'farms/deleteFarm',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.FARM_DETAIL(id)}`);
      toast.success('Farm deleted successfully');
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete farm';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const farmSlice = createSlice({
  name: 'farms',
  initialState: {
    farms: [],
    farm: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearFarmErrors: (state) => {
      state.error = null;
    },
    clearCurrentFarm: (state) => {
      state.farm = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get farms
      .addCase(getFarms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFarms.fulfilled, (state, action) => {
        state.loading = false;
        state.farms = action.payload.farms || [];
      })
      .addCase(getFarms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get farm by ID
      .addCase(getFarmById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFarmById.fulfilled, (state, action) => {
        state.loading = false;
        state.farm = action.payload;
      })
      .addCase(getFarmById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create farm
      .addCase(createFarm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFarm.fulfilled, (state, action) => {
        state.loading = false;
        state.farms.push(action.payload);
      })
      .addCase(createFarm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update farm
      .addCase(updateFarm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFarm.fulfilled, (state, action) => {
        state.loading = false;
        state.farms = state.farms.map((farm) =>
          farm.id === action.payload.id ? action.payload : farm
        );
        state.farm = action.payload;
      })
      .addCase(updateFarm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete farm
      .addCase(deleteFarm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFarm.fulfilled, (state, action) => {
        state.loading = false;
        state.farms = state.farms.filter((farm) => farm.id !== action.payload);
      })
      .addCase(deleteFarm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearFarmErrors, clearCurrentFarm } = farmSlice.actions;
export default farmSlice.reducer;
