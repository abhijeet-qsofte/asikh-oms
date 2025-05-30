// API URL configuration
export const API_URL = process.env.REACT_APP_API_URL || 'https://asikh-oms-test-cd0577c5c937.herokuapp.com';

// API version
export const API_VERSION = '/api';

// API endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: `${API_VERSION}/auth/login`,
  LOGIN_MOBILE: `${API_VERSION}/auth/login/mobile`,
  LOGIN_PIN: `${API_VERSION}/auth/login/pin`,
  SET_PIN: `${API_VERSION}/auth/set-pin`,
  REFRESH_TOKEN: `${API_VERSION}/auth/refresh-token`,
  REQUEST_PASSWORD_RESET: `${API_VERSION}/auth/request-password-reset`,
  VERIFY_PASSWORD_RESET: `${API_VERSION}/auth/verify-password-reset`,
  LOGOUT: `${API_VERSION}/auth/logout`,
  
  // User Management
  CURRENT_USER: `${API_VERSION}/users/me`,
  USERS: `${API_VERSION}/users`,
  USER_DETAIL: (id) => `${API_VERSION}/users/${id}`,
  USER_ACTIVATE: (id) => `${API_VERSION}/users/${id}/activate`,
  USER_DEACTIVATE: (id) => `${API_VERSION}/users/${id}/deactivate`,
  CHANGE_PASSWORD: `${API_VERSION}/users/change-password`,
  RESET_USER_PASSWORD: (id) => `${API_VERSION}/users/${id}/reset-password`,
  USER_ROLES: `${API_VERSION}/users/roles`,
  USER_ROLE_DELETE: (role) => `${API_VERSION}/users/roles/${role}`,
  
  // Farm Management
  FARMS: `${API_VERSION}/farms`,
  FARM_DETAIL: (id) => `${API_VERSION}/farms/${id}`,
  FARM_STATS: (id) => `${API_VERSION}/farms/${id}/stats`,
  
  // Packhouse Management
  PACKHOUSES: `${API_VERSION}/packhouses`,
  PACKHOUSE_DETAIL: (id) => `${API_VERSION}/packhouses/${id}`,
  PACKHOUSE_STATS: (id) => `${API_VERSION}/packhouses/${id}/stats`,
  
  // Variety Management
  VARIETIES: `${API_VERSION}/varieties`,
  VARIETY_DETAIL: (id) => `${API_VERSION}/varieties/${id}`,
  VARIETY_STATS: (id) => `${API_VERSION}/varieties/${id}/stats`,
  
  // QR Code Management
  QR_CODE: `${API_VERSION}/qr-codes`,
  QR_CODE_DETAIL: (id) => `${API_VERSION}/qr-codes/${id}`,
  QR_CODE_BY_VALUE: (value) => `${API_VERSION}/qr-codes/value/${value}`,
  QR_CODE_BATCH: `${API_VERSION}/qr-codes/batch`,
  QR_CODE_IMAGE: (value) => `${API_VERSION}/qr-codes/image/${value}`,
  QR_CODE_DOWNLOAD: `${API_VERSION}/qr-codes/download`,
  QR_CODE_DOWNLOAD_TOKEN: (token) => `${API_VERSION}/qr-codes/download/${token}`,
  QR_CODE_VALIDATE: (value) => `${API_VERSION}/qr-codes/validate/${value}`,
  
  // Crate Management
  CRATES: `${API_VERSION}/crates`,
  CRATE_DETAIL: (id) => `${API_VERSION}/crates/${id}`,
  CRATE_BY_QR: (qrCode) => `${API_VERSION}/crates/qr/${qrCode}`,
  CRATE_ASSIGN_BATCH: `${API_VERSION}/crates/assign-batch`,
  CRATE_SEARCH: `${API_VERSION}/crates/search`,
  CRATES_UNASSIGNED: `${API_VERSION}/crates/unassigned-list`,
  
  // Batch Management
  BATCHES: `${API_VERSION}/batches/`,
  BATCH_DETAIL: (id) => `${API_VERSION}/batches/${id}`,
  BATCH_BY_CODE: (code) => `${API_VERSION}/batches/code/${code}`,
  BATCH_DISPATCH: (id) => `${API_VERSION}/batches/${id}/dispatch`,
  BATCH_DEPART: (id) => `${API_VERSION}/batches/${id}/depart`,
  BATCH_ARRIVE: (id) => `${API_VERSION}/batches/${id}/arrive`,
  BATCH_CRATES: (id) => `${API_VERSION}/batches/${id}/crates`,
  BATCH_STATS: (id) => `${API_VERSION}/batches/${id}/stats`,
  BATCH_ADD_CRATE: (id) => `${API_VERSION}/batches/${id}/add-crate`,
  BATCH_ADD_MINIMAL_CRATE: (id) => `${API_VERSION}/batches/${id}/add-minimal-crate`,
  BATCH_RECONCILE_CRATE: (id) => `${API_VERSION}/batches/${id}/reconcile-crate`,
  BATCH_RECONCILIATION_STATS: (id) => `${API_VERSION}/batches/${id}/reconciliation-stats`,
  BATCH_WEIGHT_DETAILS: (id) => `${API_VERSION}/batches/${id}/weight-details`,
  BATCH_DELIVER: (id) => `${API_VERSION}/batches/${id}/deliver`,
  BATCH_CLOSE: (id) => `${API_VERSION}/batches/${id}/close`,
  BATCH_RECONCILIATION_STATUS: (id) => `${API_VERSION}/batches/${id}/reconciliation-status`,
  
  // Reconciliation
  RECONCILIATION_SCAN: `${API_VERSION}/reconciliation/scan`,
  RECONCILIATION_BATCH_SUMMARY: (id) => `${API_VERSION}/reconciliation/batch/${id}/summary`,
  RECONCILIATION_BATCH_LOGS: (id) => `${API_VERSION}/reconciliation/batch/${id}/logs`,
  RECONCILIATION_SEARCH: `${API_VERSION}/reconciliation/search`,
  RECONCILIATION_STATS: `${API_VERSION}/reconciliation/stats`,
  RECONCILIATION_BATCH_COMPLETE: (id) => `${API_VERSION}/reconciliation/batch/${id}/complete`,
  
  // Dispatch
  DISPATCH_SCAN: `${API_VERSION}/dispatch/scan`,
};
