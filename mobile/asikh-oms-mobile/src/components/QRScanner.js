// src/components/QRScanner.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export const QRScanner = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;

    setScanned(true);

    // Check if QR code follows the expected pattern
    const qrPattern =
      /^ASIKH-(CRATE|BATCH)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (qrPattern.test(data)) {
      onScan(data);
    } else {
      alert('Invalid QR code format');
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
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        flashMode={flashMode}
        onBarCodeScanned={handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFlash} style={styles.flashButton}>
              <Ionicons
                name={
                  flashMode === Camera.Constants.FlashMode.torch
                    ? 'flash'
                    : 'flash-off'
                }
                size={30}
                color="white"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.instructions}>
              Align QR code within the frame to scan
            </Text>
          </View>
        </View>
      </Camera>
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
