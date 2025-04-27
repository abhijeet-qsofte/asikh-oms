// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../api/authService';

// Async actions
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password, deviceInfo }, { rejectWithValue }) => {
    try {
      return await authService.login(username, password, deviceInfo);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Login failed' }
      );
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const checkAuth = createAsyncThunk('auth/check', async () => {
  const isAuth = await authService.isAuthenticated();
  if (isAuth) {
    return await authService.getCurrentUser();
  }
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = {
          id: action.payload.user_id,
          username: action.payload.username,
          role: action.payload.role,
        };
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Login failed' };
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Check auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isAuthenticated = !!action.payload;
        state.user = action.payload;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
