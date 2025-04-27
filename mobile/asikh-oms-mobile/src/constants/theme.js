// src/constants/theme.js
import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2E7D32', // Dark green
    accent: '#FF8F00', // Amber
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#212121',
    error: '#D32F2F',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    secondary: '#757575',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    danger: '#F44336',
  },
  roundness: 4,
  animation: {
    scale: 1.0,
  },
};
