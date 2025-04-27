// src/utils/deviceInfo.js
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION } from '../constants/config';

/**
 * Get device information for logging and analytics
 * @returns {Object} Device information
 */
export const getDeviceInfo = async () => {
  try {
    const deviceType =
      Device.deviceType === Device.DeviceType.PHONE
        ? 'Phone'
        : Device.deviceType === Device.DeviceType.TABLET
        ? 'Tablet'
        : 'Unknown';

    return {
      model: Device.modelName || 'Unknown',
      platform: Platform.OS,
      os_version: Platform.Version.toString(),
      app_version: APP_VERSION,
      device_type: deviceType,
      device_id:
        Device.deviceName?.replace(/\s+/g, '_') ||
        Constants.installationId ||
        'unknown',
      manufacturer: (await Device.manufacturer) || 'Unknown',
      brand: (await Device.brand) || 'Unknown',
    };
  } catch (error) {
    console.warn('Error getting device info:', error);
    return {
      platform: Platform.OS,
      app_version: APP_VERSION,
      device_id: Constants.installationId || 'unknown',
    };
  }
};

/**
 * Generate a device-specific identifier
 * @returns {string} Device identifier
 */
export const getDeviceIdentifier = async () => {
  try {
    // Try to get a unique device identifier that persists across app installs
    const deviceId =
      Device.deviceName?.replace(/\s+/g, '_') ||
      Constants.installationId ||
      (await Device.osBuildId) ||
      'unknown';

    return deviceId;
  } catch (error) {
    console.warn('Error getting device identifier:', error);
    return 'unknown_device';
  }
};
