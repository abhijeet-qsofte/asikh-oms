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
      console.log('Login thunk: attempting login with username', username);
      const result = await authService.login(username, password, deviceInfo);
      console.log('Login thunk: login successful, result:', result);
      
      // Ensure the token is set in the API client headers
      if (result && result.token) {
        console.log('Login thunk: setting token in API client');
        const apiClient = (await import('../../api/client')).default;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${result.token}`;
      }
      
      return result;
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
  
  // First check if we have tokens in storage
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  
  console.log('Initial token check:', { hasToken: !!token, hasRefreshToken: !!refreshToken });
  
  if (!token || !refreshToken) {
    console.log('No tokens found in storage, user needs to login');
    return { user: null, token: null };
  }
  
  // Set the token in API client headers immediately
  const apiClient = (await import('../../api/client')).default;
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('Set initial token in API client headers');
  
  // Try to refresh the token if needed
  try {
    const refreshed = await authService.checkAndRefreshToken();
    console.log('Token refresh attempt result:', refreshed);
    
    // Get the possibly refreshed token
    const currentToken = await AsyncStorage.getItem(TOKEN_KEY);
    
    // If we have a token, get the user info
    if (currentToken) {
      const user = await authService.getCurrentUser();
      console.log('Authentication successful, user:', user ? user.username : 'unknown');
      
      // Make sure the token is set in API client headers
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      
      return { user, token: currentToken };
    }
  } catch (error) {
    console.error('Error during authentication check:', error);
  }
  
  // If we get here, authentication failed
  console.log('Authentication check failed, clearing tokens');
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
  delete apiClient.defaults.headers.common['Authorization'];
  
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
        
        // Handle different response structures
        if (action.payload.token) {
          // New response structure
          state.token = action.payload.token;
          state.user = action.payload.user || {};
        } else if (action.payload.access_token) {
          // Old response structure
          state.token = action.payload.access_token;
          state.user = {
            id: action.payload.user_id,
            username: action.payload.username,
            role: action.payload.role,
          };
        }
        
        console.log('Login fulfilled: Authentication state updated', {
          isAuthenticated: state.isAuthenticated,
          hasToken: !!state.token,
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
