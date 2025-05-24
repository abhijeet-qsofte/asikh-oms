// src/constants/config.js

// API Configuration
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Environment configuration
const ENV = {
  development: {
    // For local development, use the debugger host or fallback to localhost/emulator
    apiUrl: Constants.manifest?.debuggerHost
      ? `http://${Constants.manifest.debuggerHost.split(':')[0]}:8000`
      : `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:8000`
  },
  test: {
    // Heroku test environment - using full domain name to avoid JWT signature issues
    apiUrl: 'https://asikh-oms-test-cd0577c5c937.herokuapp.com'
  },
  production: {
    // Production environment (when you set it up)
    apiUrl: 'https://asikh-oms-prod.herokuapp.com' // Update this when you deploy to production
  }
};

// Set the current environment - 'test' for Heroku, 'development' for local
const CURRENT_ENV = 'test';

// Export the API base URL based on the current environment
export const API_BASE_URL = ENV[CURRENT_ENV].apiUrl;

// For debugging
console.log('API Base URL:', API_BASE_URL);

// Storage Keys
export const TOKEN_KEY = '@asikh:access_token';
export const REFRESH_TOKEN_KEY = '@asikh:refresh_token';
export const USER_INFO_KEY = '@asikh:user_info';
export const TOKEN_EXPIRY_KEY = '@asikh:token_expiry';

// App Configuration
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Asikh OMS';

// Quality Grades
export const QUALITY_GRADES = [
  { label: 'A - Premium', value: 'A' },
  { label: 'B - Standard', value: 'B' },
  { label: 'C - Processing', value: 'C' },
  { label: 'Reject', value: 'reject' },
];

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  HARVESTER: 'harvester',
  PACKHOUSE: 'packhouse',
};

// Batch Statuses
export const BATCH_STATUSES = {
  OPEN: 'open',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  RECONCILED: 'reconciled',
  CLOSED: 'closed',
};

// QR Code pattern
export const QR_CODE_PATTERN =
  /^ASIKH-(CRATE|BATCH)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
