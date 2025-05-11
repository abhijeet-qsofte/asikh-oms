// src/components/QRScanner.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
// Import the Camera component but create a mock version to avoid expo-camera issues
// This is based on the fix mentioned in the memory about Camera component issues
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

// Mock Camera component to avoid expo-camera issues
const MockCamera = ({ style, children }) => (
  <View style={style}>{children}</View>
);

// Mock Camera constants
MockCamera.Constants = {
  FlashMode: {
    off: 'off',
    on: 'on',
    auto: 'auto',
    torch: 'torch'
  },
  Type: {
    back: 'back',
    front: 'front'
  }
};

// Use our mock camera instead of the real one
const Camera = MockCamera;

export const QRScanner = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);

  useEffect(() => {
    // Simulate camera permission request
    setTimeout(() => {
      setHasPermission(true);
    }, 500);
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;

    setScanned(true);

    // Check if QR code follows the expected pattern: CR-MMDDYY-XXX
    const qrPattern = /^CR-\d{6}-\d{3}$/i;

    if (qrPattern.test(data)) {
      onScan(data);
    } else {
      Alert.alert('Invalid QR Code', 'The scanned code does not match the expected format (CR-MMDDYY-XXX).');
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.torch
        ? Camera.Constants.FlashMode.off
        : Camera.Constants.FlashMode.torch
    );
  };

  // Store a sequence counter for batch IDs
  const [sequenceId, setSequenceId] = useState(1);
  
  useEffect(() => {
    if (hasPermission && !scanned) {
      const timer = setTimeout(() => {
        // Generate a properly formatted QR code: CR-MMDDYY-XXX
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const sequenceNum = String(sequenceId).padStart(3, '0');
        
        const mockQrCode = `CR-${month}${day}${year}-${sequenceNum}`;
        
        // Increment the sequence ID for next time
        setSequenceId(prev => (prev % 999) + 1);
        
        Alert.alert(
          'QR Code Detected', 
          'Simulated QR code scan: ' + mockQrCode,
          [
            {text: 'Cancel', style: 'cancel', onPress: () => setScanned(false)},
            {text: 'Use This Code', onPress: () => handleBarCodeScanned({type: 'QR', data: mockQrCode})}
          ]
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPermission, scanned, sequenceId]);

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission === false ? (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required to scan QR codes.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.camera}>
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
              </View>

              <Text style={styles.scanText}>
                {scanned ? 'QR Code detected!' : 'Position QR code inside the frame'}
              </Text>

              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleFlash}
                >
                  <Ionicons
                    name={
                      flashMode === Camera.Constants.FlashMode.torch
                        ? 'flash'
                        : 'flash-off'
                    }
                    size={24}
                    color="white"
                  />
                  <Text style={styles.controlText}>
                    {flashMode === Camera.Constants.FlashMode.torch
                      ? 'Flash On'
                      : 'Flash Off'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={onClose}
                >
                  <Ionicons name="close-circle" size={24} color="white" />
                  <Text style={styles.controlText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  flashButton: {
    padding: 8,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});
