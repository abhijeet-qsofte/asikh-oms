// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../api/authService';
import { AUTH_CREDENTIALS_KEY, USER_INFO_KEY, PIN_AUTH_KEY, DEFAULT_PIN } from '../../constants/config';

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
      
      // Store both username, password and PIN for future PIN-based logins
      try {
        // Store credentials for regular auth
        await AsyncStorage.setItem(AUTH_CREDENTIALS_KEY, JSON.stringify({
          username,
          password
        }));
        
        // Store PIN data separately
        await AsyncStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
          username,
          pin: DEFAULT_PIN,
          password // Store password here too for PIN auth
        }));
        console.log('Saved PIN and credential data for future use');
      } catch (pinError) {
        console.error('Error saving PIN/credential data:', pinError);
        // Continue with login even if storage fails
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
  // Clear PIN auth data when logging out
  try {
    await AsyncStorage.removeItem(PIN_AUTH_KEY);
  } catch (error) {
    console.error('Error removing PIN auth data:', error);
  }
  
  await authService.logout();
});

export const loginWithPin = createAsyncThunk(
  'auth/loginWithPin',
  async ({ pin }, { rejectWithValue }) => {
    try {
      console.log('PIN login thunk: attempting login with PIN');
      
      // Get stored PIN data
      const pinDataStr = await AsyncStorage.getItem(PIN_AUTH_KEY);
      if (!pinDataStr) {
        console.error('PIN login failed: No PIN data found');
        return rejectWithValue({ message: 'No PIN data found. Please login with username and password first.' });
      }
      
      const pinData = JSON.parse(pinDataStr);
      
      // Verify PIN
      if (pinData.pin !== pin) {
        console.error('PIN login failed: Invalid PIN');
        return rejectWithValue({ message: 'Invalid PIN' });
      }
      
      // Use stored username and password to login
      if (!pinData.password) {
        console.error('PIN login failed: No stored password');
        return rejectWithValue({ message: 'No stored password. Please login with username and password first.' });
      }
      
      const result = await authService.login(pinData.username, pinData.password);
      
      if (!result.success) {
        console.error('PIN login failed:', result.error);
        return rejectWithValue({ message: result.error || 'PIN login failed' });
      }
      
      console.log('PIN login successful');
      return {
        user: result.user
      };
    } catch (error) {
      console.error('PIN login error:', error);
      return rejectWithValue(
        error.response?.data || { message: 'PIN login failed', detail: error.message }
      );
    }
  }
);

export const checkAuth = createAsyncThunk('auth/check', async (_, { dispatch }) => {
  console.log('Authentication bypassed - always authenticated');
  
  // Create a default admin user
  const defaultUser = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User'
  };
  
  // Always return as authenticated with the default user
  return { user: defaultUser };
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: { username: 'admin', role: 'admin' }, // Default user with admin role
    isAuthenticated: true, // Always authenticated
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
      // PIN Login
      .addCase(loginWithPin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithPin.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user || {};
        
        console.log('PIN Login fulfilled: Authentication state updated', {
          isAuthenticated: state.isAuthenticated,
          hasUser: !!state.user
        });
      })
      .addCase(loginWithPin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'PIN login failed' };
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
