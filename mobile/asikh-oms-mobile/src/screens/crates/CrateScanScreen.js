// src/screens/crates/CrateScanScreen.js
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QRScanner } from '../../components/QRScanner';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function CrateScanScreen() {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);

  const handleScan = (qrCode) => {
    setScanning(false);
    // Use the correct navigation approach for nested navigators
    navigation.navigate('Crates', {
      screen: 'CrateForm',
      params: { qrCode }
    });
  };

  const startScanning = () => {
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <QRScanner onScan={handleScan} onClose={stopScanning} />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="qr-code-outline"
              size={100}
              color={theme.colors.primary}
            />
            <Text style={styles.title}>Scan Crate QR Code</Text>
            <Text style={styles.description}>
              Scan the QR code on the crate to begin the harvest recording
              process.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={startScanning}>
              Start Scanning
            </Button>

            <TouchableOpacity
              style={styles.manualEntry}
              onPress={() => navigation.navigate('Crates', {
                screen: 'CrateForm',
                params: { qrCode: null }
              })}
            >
              <Text style={styles.manualEntryText}>Enter QR Code manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.secondary,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  manualEntry: {
    marginTop: 15,
    marginBottom: 20,
  },
  manualEntryText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
});
