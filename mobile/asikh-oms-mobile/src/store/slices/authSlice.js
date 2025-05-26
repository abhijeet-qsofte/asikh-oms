// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../api/authService';
import { AUTH_CREDENTIALS_KEY, USER_INFO_KEY } from '../../constants/config';

// Async actions
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      console.log('Login thunk: attempting login with username', username);
      const result = await authService.login(username, password);
      
      if (!result.success) {
        console.error('Login thunk: login failed', result.error);
        return rejectWithValue({ message: result.error || 'Login failed' });
      }
      
      console.log('Login thunk: login successful');
      return {
        user: result.user
      };
    } catch (error) {
      console.error('Login thunk error:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Login failed', detail: error.message }
      );
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const checkAuth = createAsyncThunk('auth/check', async () => {
  console.log('Checking authentication status on app startup');
  
  try {
    // Check if user is authenticated
    const isAuthenticated = await authService.isAuthenticated();
    console.log('Authentication check result:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('Not authenticated, user needs to login');
      return { user: null };
    }
    
    // Get user info
    const user = await authService.getCurrentUser();
    console.log('User info retrieved:', user ? 'success' : 'not found');
    
    return { user };
  } catch (error) {
    console.error('Auth check error:', error);
    return { user: null };
  }
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
        state.user = action.payload.user || {};
        
        console.log('Login fulfilled: Authentication state updated', {
          isAuthenticated: state.isAuthenticated,
          hasUser: !!state.user
        });
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
        state.loading = false;
        state.isAuthenticated = !!action.payload.user;
        state.user = action.payload.user;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
