// src/store/slices/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from '../../api/adminService';

// Initial state
const initialState = {
  farms: [],
  packhouses: [],
  varieties: [],
  users: [],
  currentFarm: null,
  currentPackhouse: null,
  currentVariety: null,
  currentUser: null,
  loading: false,
  error: null,
  success: false
};

// Async thunks for farms
export const getFarms = createAsyncThunk(
  'admin/getFarms',
  async (params, { rejectWithValue }) => {
    try {
      return await adminService.getFarms(params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch farms' }
      );
    }
  }
);

export const createFarm = createAsyncThunk(
  'admin/createFarm',
  async (farmData, { rejectWithValue }) => {
    try {
      return await adminService.createFarm(farmData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create farm' }
      );
    }
  }
);

export const updateFarm = createAsyncThunk(
  'admin/updateFarm',
  async ({ farmId, farmData }, { rejectWithValue }) => {
    try {
      return await adminService.updateFarm(farmId, farmData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update farm' }
      );
    }
  }
);

// Async thunks for packhouses
export const getPackhouses = createAsyncThunk(
  'admin/getPackhouses',
  async (params, { rejectWithValue }) => {
    try {
      return await adminService.getPackhouses(params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch packhouses' }
      );
    }
  }
);

export const createPackhouse = createAsyncThunk(
  'admin/createPackhouse',
  async (packhouseData, { rejectWithValue }) => {
    try {
      return await adminService.createPackhouse(packhouseData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create packhouse' }
      );
    }
  }
);

export const updatePackhouse = createAsyncThunk(
  'admin/updatePackhouse',
  async ({ packhouseId, packhouseData }, { rejectWithValue }) => {
    try {
      return await adminService.updatePackhouse(packhouseId, packhouseData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update packhouse' }
      );
    }
  }
);

// Async thunks for varieties
export const getVarieties = createAsyncThunk(
  'admin/getVarieties',
  async (params, { rejectWithValue }) => {
    try {
      return await adminService.getVarieties(params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch varieties' }
      );
    }
  }
);

export const createVariety = createAsyncThunk(
  'admin/createVariety',
  async (varietyData, { rejectWithValue }) => {
    try {
      return await adminService.createVariety(varietyData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create variety' }
      );
    }
  }
);

export const updateVariety = createAsyncThunk(
  'admin/updateVariety',
  async ({ varietyId, varietyData }, { rejectWithValue }) => {
    try {
      return await adminService.updateVariety(varietyId, varietyData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update variety' }
      );
    }
  }
);

// Async thunks for users
export const getUsers = createAsyncThunk(
  'admin/getUsers',
  async (params, { rejectWithValue }) => {
    try {
      return await adminService.getUsers(params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch users' }
      );
    }
  }
);

export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      return await adminService.createUser(userData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create user' }
      );
    }
  }
);

export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      return await adminService.updateUser(userId, userData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update user' }
      );
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    resetAdminState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
    clearCurrentItems: (state) => {
      state.currentFarm = null;
      state.currentPackhouse = null;
      state.currentVariety = null;
      state.currentUser = null;
    }
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
        // Check if the response has a farms property or is an array directly
        if (action.payload && action.payload.farms) {
          state.farms = action.payload.farms;
        } else if (Array.isArray(action.payload)) {
          state.farms = action.payload;
        } else {
          // Fallback to empty array if payload structure is unexpected
          console.warn('Unexpected farms payload structure:', action.payload);
          state.farms = [];
        }
      })
      .addCase(getFarms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create farm
      .addCase(createFarm.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createFarm.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentFarm = action.payload;
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
        state.success = false;
      })
      .addCase(updateFarm.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentFarm = action.payload;
        
        // Update the farm in the farms array
        const index = state.farms.findIndex(farm => farm.id === action.payload.id);
        if (index !== -1) {
          state.farms[index] = action.payload;
        }
      })
      .addCase(updateFarm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get packhouses
      .addCase(getPackhouses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPackhouses.fulfilled, (state, action) => {
        state.loading = false;
        // Check if the response has a packhouses property or is an array directly
        if (action.payload && action.payload.packhouses) {
          state.packhouses = action.payload.packhouses;
        } else if (Array.isArray(action.payload)) {
          state.packhouses = action.payload;
        } else {
          // Fallback to empty array if payload structure is unexpected
          console.warn('Unexpected packhouses payload structure:', action.payload);
          state.packhouses = [];
        }
      })
      .addCase(getPackhouses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create packhouse
      .addCase(createPackhouse.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createPackhouse.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentPackhouse = action.payload;
        state.packhouses.push(action.payload);
      })
      .addCase(createPackhouse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update packhouse
      .addCase(updatePackhouse.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updatePackhouse.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentPackhouse = action.payload;
        
        // Update the packhouse in the packhouses array
        const index = state.packhouses.findIndex(packhouse => packhouse.id === action.payload.id);
        if (index !== -1) {
          state.packhouses[index] = action.payload;
        }
      })
      .addCase(updatePackhouse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get varieties
      .addCase(getVarieties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVarieties.fulfilled, (state, action) => {
        state.loading = false;
        state.varieties = action.payload;
      })
      .addCase(getVarieties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create variety
      .addCase(createVariety.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createVariety.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentVariety = action.payload;
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
        state.success = false;
      })
      .addCase(updateVariety.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentVariety = action.payload;
        
        // Update the variety in the varieties array
        const index = state.varieties.findIndex(variety => variety.id === action.payload.id);
        if (index !== -1) {
          state.varieties[index] = action.payload;
        }
      })
      .addCase(updateVariety.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get users
      .addCase(getUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create user
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentUser = action.payload;
        state.users.push(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currentUser = action.payload;
        
        // Update the user in the users array
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { resetAdminState, clearCurrentItems } = adminSlice.actions;
export default adminSlice.reducer;
