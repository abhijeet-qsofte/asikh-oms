// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../api/authService';
import { TOKEN_KEY } from '../../constants/config';

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
  // First try to refresh the token if needed
  await authService.checkAndRefreshToken();
  
  // Then check if authenticated
  const isAuth = await authService.isAuthenticated();
  if (isAuth) {
    const user = await authService.getCurrentUser();
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return { user, token };
  }
  return { user: null, token: null };
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
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
        state.token = action.payload.access_token;
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
        state.token = null;
        state.isAuthenticated = false;
      })
      // Check auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload.user;
        state.user = action.payload.user;
        state.token = action.payload.token;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
