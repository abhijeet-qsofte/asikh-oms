// src/components/QRScanner.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export const QRScanner = ({ onScan, onClose }) => {
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);

  const validateAndProcessCode = (code) => {
    if (scanned) return;

    // Check if QR code follows the expected pattern: CR-MMDDYY-XXX
    const qrPattern = /^CR-\d{6}-\d{3}$/i;

    if (qrPattern.test(code)) {
      setScanned(true);
      onScan(code);
    } else {
      Alert.alert(
        'Invalid QR Code',
        'The code does not match the expected format (CR-MMDDYY-XXX).'
      );
    }
  };
  
  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      validateAndProcessCode(manualCode.trim());
    }
  };

  // For generating test codes
  const [sequenceId, setSequenceId] = useState(1);
  
  const generateTestCode = () => {
    // Generate a properly formatted QR code: CR-MMDDYY-XXX
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const sequenceNum = String(sequenceId).padStart(3, '0');

    const mockQrCode = `CR-${month}${day}${year}-${sequenceNum}`;

    // Increment the sequence ID for next time
    setSequenceId((prev) => (prev % 999) + 1);
    
    setManualCode(mockQrCode);
  };
  
  const toggleEntryMode = () => {
    setIsManualEntry(!isManualEntry);
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {isManualEntry ? 'Manual QR Entry' : 'QR Code Scanner'}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close-circle" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {isManualEntry ? (
        <View style={styles.manualEntryContainer}>
          <Text style={styles.instructionText}>
            Enter QR code in format: CR-MMDDYY-XXX
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="CR-051225-001"
              placeholderTextColor="#888"
              autoCapitalize="characters"
            />
            
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={generateTestCode}
            >
              <Ionicons name="refresh" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.submitButton, !manualCode.trim() && styles.disabledButton]}
            onPress={handleManualSubmit}
            disabled={!manualCode.trim()}
          >
            <Text style={styles.submitButtonText}>Submit Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleEntryMode}
          >
            <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.toggleButtonText}>Switch to Camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mockScannerContainer}>
          <View style={styles.mockCamera}>
            <View style={styles.scanFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            
            {scanned && (
              <View style={styles.scannedOverlay}>
                <Ionicons name="checkmark-circle" size={60} color="green" />
                <Text style={styles.scannedText}>QR Code Detected!</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.instructionText}>
            {scanned ? 'QR Code detected!' : 'Position QR code inside the frame'}
          </Text>
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={generateTestCode}
            >
              <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.controlText}>Generate Test Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleEntryMode}
            >
              <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.controlText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>
          
          {!scanned && (
            <TouchableOpacity 
              style={styles.simulateScanButton}
              onPress={() => manualCode ? validateAndProcessCode(manualCode) : generateTestCode()}
            >
              <Text style={styles.simulateScanButtonText}>
                Simulate Scan {manualCode ? `(${manualCode})` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  closeButton: {
    padding: 5,
  },
  manualEntryContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  generateButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginLeft: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  toggleButtonText: {
    color: theme.colors.primary,
    marginLeft: 8,
    fontSize: 16,
  },
  mockScannerContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  mockCamera: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.primary,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.primary,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.primary,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.primary,
  },
  scannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
  },
  controlText: {
    color: '#333',
    marginTop: 5,
    fontSize: 14,
  },
  simulateScanButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginTop: 20,
  },
  simulateScanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
