// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../api/authService';
import { TOKEN_KEY, TOKEN_EXPIRY_KEY } from '../../constants/config';

// Async actions
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password, deviceInfo }, { rejectWithValue }) => {
    try {
      console.log('Login thunk: attempting login with username', username);
      const result = await authService.login(username, password, deviceInfo);
      console.log('Login thunk: login successful');
      
      // Get the token from storage after login
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        console.log('Login thunk: token retrieved from storage, setting in API client');
        const apiClient = (await import('../../api/client')).default;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify the header was set
        console.log('Authorization header set:', !!apiClient.defaults.headers.common['Authorization']);
      } else {
        console.error('Login thunk: No token found in storage after login');
      }
      
      return {
        user: {
          id: result.user_id,
          username: result.username,
          role: result.role
        },
        token: token
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

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Refresh token thunk: attempting to refresh token');
      const result = await authService.refreshToken();
      
      // Get the token from storage after refresh
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      
      if (token) {
        // Set the token in API client headers
        const apiClient = (await import('../../api/client')).default;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Refresh token thunk: token refreshed and set in API client');
        
        // Get current user info
        const user = await authService.getCurrentUser();
        
        return {
          user,
          token,
          expiresAt: await AsyncStorage.getItem(TOKEN_EXPIRY_KEY)
        };
      } else {
        console.error('Refresh token thunk: No token found after refresh');
        return rejectWithValue({ message: 'Token refresh failed' });
      }
    } catch (error) {
      console.error('Refresh token thunk error:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Token refresh failed', detail: error.message }
      );
    }
  }
);

export const checkAuth = createAsyncThunk('auth/check', async (_, { dispatch }) => {
  console.log('Checking authentication status on app startup');
  
  try {
    // Check if user is authenticated with valid token
    const isAuthenticated = await authService.isAuthenticated();
    console.log('Authentication check result:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('Not authenticated, user needs to login');
      return { user: null, token: null, expiresAt: null };
    }
    
    // Get the token, expiry and user info
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const expiresAt = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    const user = await authService.getCurrentUser();
    
    // Set the token in API client headers
    const apiClient = (await import('../../api/client')).default;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Set token in API client headers');
    
    console.log('Authentication successful, user:', user ? user.username : 'unknown');
    return { user, token, expiresAt };
  } catch (error) {
    console.error('Error during authentication check:', error);
    return { user: null, token: null, expiresAt: null };
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    expiresAt: null,
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
          // Get expiry from AsyncStorage in the background
          AsyncStorage.getItem(TOKEN_EXPIRY_KEY).then(expiry => {
            if (expiry) state.expiresAt = expiry;
          });
        } else if (action.payload.access_token) {
          // Old response structure
          state.token = action.payload.access_token;
          state.user = {
            id: action.payload.user_id,
            username: action.payload.username,
            role: action.payload.role,
          };
          // Get expiry from AsyncStorage in the background
          AsyncStorage.getItem(TOKEN_EXPIRY_KEY).then(expiry => {
            if (expiry) state.expiresAt = expiry;
          });
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
      // Refresh token
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.expiresAt = action.payload.expiresAt;
        
        console.log('Token refresh fulfilled: Authentication state updated', {
          isAuthenticated: state.isAuthenticated,
          hasToken: !!state.token,
          hasUser: !!state.user,
          expiresAt: state.expiresAt ? new Date(parseInt(state.expiresAt)).toISOString() : null
        });
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Token refresh failed' };
        // Don't clear auth state here - let the response interceptor handle it
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
      })
      // Check auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload.user;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.expiresAt = action.payload.expiresAt;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
