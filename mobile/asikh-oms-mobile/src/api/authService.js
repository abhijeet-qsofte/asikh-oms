// src/api/authService.js
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
} from '../constants/config';

export const authService = {
  async login(username, password, deviceInfo = null) {
    const response = await apiClient.post('/api/auth/login/mobile', {
      username,
      password,
      device_info: deviceInfo,
    });

    const {
      access_token,
      refresh_token,
      user_id,
      username: user,
      role,
    } = response.data;

    // Store auth tokens and user info
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    await AsyncStorage.setItem(
      USER_INFO_KEY,
      JSON.stringify({
        id: user_id,
        username: user,
        role,
      })
    );

    return response.data;
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Continue with local logout even if API call fails
      console.error('Logout API call failed:', error);
    }

    // Clear local storage
    return AsyncStorage.multiRemove([
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
    ]);
  },

  async getCurrentUser() {
    const userInfo = await AsyncStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  },

  async isAuthenticated() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return !!token;
  },
};
