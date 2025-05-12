// src/screens/reconciliation/ReconciliationScanScreen.js
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { QRScanner } from '../../components/QRScanner';
import Button from '../../components/Button';
import QRCodeInputModal from '../../components/QRCodeInputModal';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { reconcileCrate } from '../../store/slices/reconciliationSlice';

export default function ReconciliationScanScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.reconciliation);
  
  const [scanning, setScanning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Get batch ID from route params if available
  const batchId = route.params?.batchId;

  const handleScan = (qrCode) => {
    setScanning(false);
    
    if (!batchId) {
      Alert.alert('Error', 'No batch selected. Please select a batch first.');
      navigation.goBack();
      return;
    }
    
    // Confirm reconciliation
    Alert.alert(
      'Reconcile Crate',
      `Do you want to reconcile crate ${qrCode} with the selected batch?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reconcile',
          onPress: () => {
            // Dispatch the reconciliation action
            dispatch(reconcileCrate({ batchId, qrCode }))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Crate reconciled successfully');
                navigation.navigate('ReconciliationDetail', { 
                  qrCode,
                  batchId
                });
              })
              .catch((err) => {
                Alert.alert(
                  'Error',
                  err.detail || err.message || 'Failed to reconcile crate'
                );
              });
          },
        },
      ]
    );
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
              name="checkmark-circle-outline"
              size={100}
              color={theme.colors.primary}
            />
            <Text style={styles.title}>Scan Crate for Reconciliation</Text>
            <Text style={styles.description}>
              Scan the QR code on the crate to reconcile it with the selected batch.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={startScanning}>
              Start Scanning
            </Button>

            <TouchableOpacity
              style={styles.manualEntry}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.manualEntryText}>Enter QR Code manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* QR Code Input Modal */}
      <QRCodeInputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleScan}
        title="Enter Crate QR Code"
        description="Enter the QR code of the crate you want to reconcile with this batch."
      />
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
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 40,
  },
  manualEntry: {
    marginTop: 20,
    alignItems: 'center',
  },
  manualEntryText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
});
