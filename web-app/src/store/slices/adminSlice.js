import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, ENDPOINTS } from '../../constants/api';

// Farms
export const getFarms = createAsyncThunk(
  'admin/getFarms',
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

export const createFarm = createAsyncThunk(
  'admin/createFarm',
  async (farmData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.FARMS}`, farmData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create farm';
      return rejectWithValue(message);
    }
  }
);

export const updateFarm = createAsyncThunk(
  'admin/updateFarm',
  async ({ id, farmData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.FARM_DETAIL(id)}`, farmData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update farm';
      return rejectWithValue(message);
    }
  }
);

export const deleteFarm = createAsyncThunk(
  'admin/deleteFarm',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.FARM_DETAIL(id)}`);
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete farm';
      return rejectWithValue(message);
    }
  }
);

// Packhouses
export const getPackhouses = createAsyncThunk(
  'admin/getPackhouses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.PACKHOUSES}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch packhouses';
      return rejectWithValue(message);
    }
  }
);

export const createPackhouse = createAsyncThunk(
  'admin/createPackhouse',
  async (packhouseData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.PACKHOUSES}`, packhouseData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create packhouse';
      return rejectWithValue(message);
    }
  }
);

export const updatePackhouse = createAsyncThunk(
  'admin/updatePackhouse',
  async ({ id, packhouseData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.PACKHOUSE_DETAIL(id)}`, packhouseData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update packhouse';
      return rejectWithValue(message);
    }
  }
);

export const deletePackhouse = createAsyncThunk(
  'admin/deletePackhouse',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.PACKHOUSE_DETAIL(id)}`);
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete packhouse';
      return rejectWithValue(message);
    }
  }
);

// Varieties
export const getVarieties = createAsyncThunk(
  'admin/getVarieties',
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

export const createVariety = createAsyncThunk(
  'admin/createVariety',
  async (varietyData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.VARIETIES}`, varietyData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create variety';
      return rejectWithValue(message);
    }
  }
);

export const updateVariety = createAsyncThunk(
  'admin/updateVariety',
  async ({ id, varietyData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.VARIETY_DETAIL(id)}`, varietyData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update variety';
      return rejectWithValue(message);
    }
  }
);

export const deleteVariety = createAsyncThunk(
  'admin/deleteVariety',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.VARIETY_DETAIL(id)}`);
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete variety';
      return rejectWithValue(message);
    }
  }
);

// Users
export const getUsers = createAsyncThunk(
  'admin/getUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}${ENDPOINTS.USERS}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch users';
      return rejectWithValue(message);
    }
  }
);

export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.USERS}`, userData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create user';
      return rejectWithValue(message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}${ENDPOINTS.USER_DETAIL(id)}`, userData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update user';
      return rejectWithValue(message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}${ENDPOINTS.USER_DETAIL(id)}`);
      return id;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete user';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  farms: {
    data: [],
    loading: false,
    error: null,
  },
  packhouses: {
    data: [],
    loading: false,
    error: null,
  },
  varieties: {
    data: [],
    loading: false,
    error: null,
  },
  users: {
    data: [],
    loading: false,
    error: null,
  },
  currentItem: null,
  formLoading: false,
  formError: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearFormError: (state) => {
      state.formError = null;
    },
    setCurrentItem: (state, action) => {
      state.currentItem = action.payload;
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Farms
      .addCase(getFarms.pending, (state) => {
        state.farms.loading = true;
        state.farms.error = null;
      })
      .addCase(getFarms.fulfilled, (state, action) => {
        state.farms.loading = false;
        state.farms.data = action.payload.farms || [];
      })
      .addCase(getFarms.rejected, (state, action) => {
        state.farms.loading = false;
        state.farms.error = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(createFarm.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(createFarm.fulfilled, (state, action) => {
        state.formLoading = false;
        state.farms.data.push(action.payload);
        toast.success('Farm created successfully');
      })
      .addCase(createFarm.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(updateFarm.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(updateFarm.fulfilled, (state, action) => {
        state.formLoading = false;
        const index = state.farms.data.findIndex((farm) => farm.id === action.payload.id);
        if (index !== -1) {
          state.farms.data[index] = action.payload;
        }
        toast.success('Farm updated successfully');
      })
      .addCase(updateFarm.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(deleteFarm.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(deleteFarm.fulfilled, (state, action) => {
        state.formLoading = false;
        state.farms.data = state.farms.data.filter((farm) => farm.id !== action.payload);
        toast.success('Farm deleted successfully');
      })
      .addCase(deleteFarm.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      // Packhouses
      .addCase(getPackhouses.pending, (state) => {
        state.packhouses.loading = true;
        state.packhouses.error = null;
      })
      .addCase(getPackhouses.fulfilled, (state, action) => {
        state.packhouses.loading = false;
        state.packhouses.data = action.payload.packhouses || [];
      })
      .addCase(getPackhouses.rejected, (state, action) => {
        state.packhouses.loading = false;
        state.packhouses.error = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(createPackhouse.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(createPackhouse.fulfilled, (state, action) => {
        state.formLoading = false;
        state.packhouses.data.push(action.payload);
        toast.success('Packhouse created successfully');
      })
      .addCase(createPackhouse.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(updatePackhouse.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(updatePackhouse.fulfilled, (state, action) => {
        state.formLoading = false;
        const index = state.packhouses.data.findIndex((packhouse) => packhouse.id === action.payload.id);
        if (index !== -1) {
          state.packhouses.data[index] = action.payload;
        }
        toast.success('Packhouse updated successfully');
      })
      .addCase(updatePackhouse.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(deletePackhouse.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(deletePackhouse.fulfilled, (state, action) => {
        state.formLoading = false;
        state.packhouses.data = state.packhouses.data.filter((packhouse) => packhouse.id !== action.payload);
        toast.success('Packhouse deleted successfully');
      })
      .addCase(deletePackhouse.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      // Varieties
      .addCase(getVarieties.pending, (state) => {
        state.varieties.loading = true;
        state.varieties.error = null;
      })
      .addCase(getVarieties.fulfilled, (state, action) => {
        state.varieties.loading = false;
        state.varieties.data = action.payload.varieties || [];
      })
      .addCase(getVarieties.rejected, (state, action) => {
        state.varieties.loading = false;
        state.varieties.error = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(createVariety.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(createVariety.fulfilled, (state, action) => {
        state.formLoading = false;
        state.varieties.data.push(action.payload);
        toast.success('Variety created successfully');
      })
      .addCase(createVariety.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(updateVariety.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(updateVariety.fulfilled, (state, action) => {
        state.formLoading = false;
        const index = state.varieties.data.findIndex((variety) => variety.id === action.payload.id);
        if (index !== -1) {
          state.varieties.data[index] = action.payload;
        }
        toast.success('Variety updated successfully');
      })
      .addCase(updateVariety.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(deleteVariety.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(deleteVariety.fulfilled, (state, action) => {
        state.formLoading = false;
        state.varieties.data = state.varieties.data.filter((variety) => variety.id !== action.payload);
        toast.success('Variety deleted successfully');
      })
      .addCase(deleteVariety.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      // Users
      .addCase(getUsers.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.data = action.payload.users || [];
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(createUser.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.formLoading = false;
        state.users.data.push(action.payload);
        toast.success('User created successfully');
      })
      .addCase(createUser.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(updateUser.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.formLoading = false;
        const index = state.users.data.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) {
          state.users.data[index] = action.payload;
        }
        toast.success('User updated successfully');
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      })
      
      .addCase(deleteUser.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.formLoading = false;
        state.users.data = state.users.data.filter((user) => user.id !== action.payload);
        toast.success('User deleted successfully');
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload;
        toast.error(action.payload);
      });
  },
});

export const { clearFormError, setCurrentItem, clearCurrentItem } = adminSlice.actions;
export default adminSlice.reducer;
