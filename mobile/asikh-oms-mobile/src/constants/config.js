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
      : `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:8000`,
    usePin: false, // Use regular username/password in development
  },
  test: {
    // Heroku test environment - using full domain name to avoid JWT signature issues
    apiUrl: 'https://asikh-oms-test-cd0577c5c937.herokuapp.com',
    usePin: true, // Temporarily enabled for testing
  },
  bypass: {
    // Heroku environment with bypass authentication enabled
    apiUrl: 'https://asikh-oms-test-cd0577c5c937.herokuapp.com',
    usePin: false, // PIN not needed with bypass authentication
  },
  production: {
    // Production environment (when you set it up)
    apiUrl: 'https://asikh-oms-prod.herokuapp.com', // Update this when you deploy to production
    usePin: true, // Use PIN-based authentication in production
  },
};

// Set the current environment - 'bypass' for unauthenticated Heroku, 'test' for authenticated Heroku, 'development' for local
const CURRENT_ENV = 'bypass';

// Export the API base URL based on the current environment
export const API_BASE_URL = ENV[CURRENT_ENV].apiUrl;
export const USE_PIN_AUTH = ENV[CURRENT_ENV].usePin;

// Authentication mode - set to false to bypass authentication
// This is now controlled by the BYPASS_AUTH environment variable on the server
export const REQUIRE_AUTHENTICATION = false; // Set to false to bypass all authentication

// For debugging
console.log('API Base URL:', API_BASE_URL);
console.log('Using PIN Authentication:', USE_PIN_AUTH);
console.log('Authentication Required:', REQUIRE_AUTHENTICATION);

// Storage Keys for Authentication
export const AUTH_CREDENTIALS_KEY = '@asikh:auth_credentials';
export const USER_INFO_KEY = '@asikh:user_info';
export const PIN_AUTH_KEY = '@asikh:pin_auth';
export const TOKEN_KEY = '@asikh:token';

// PIN Authentication Configuration
export const DEFAULT_PIN = '1234'; // Default PIN for all users in production
export const PIN_LENGTH = 4;

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
