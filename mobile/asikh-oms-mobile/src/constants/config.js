// src/constants/config.js

// API Configuration
export const API_BASE_URL = 'http://192.168.1.100:8000'; // Replace with your API server address

// Storage Keys
export const TOKEN_KEY = '@asikh:access_token';
export const REFRESH_TOKEN_KEY = '@asikh:refresh_token';
export const USER_INFO_KEY = '@asikh:user_info';

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
