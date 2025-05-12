// src/screens/batches/ReconciliationDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Paragraph, Divider, Chip, Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import Button from '../../components/Button';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import batchService from '../../api/batchService';
import {
  getBatchById,
  getBatchStats,
  closeBatch
} from '../../store/slices/batchSlice';

export default function ReconciliationDetailScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { currentBatch: reduxBatch, batchStats, loading, error } = useSelector((state) => state.batches);
  
  // Local state for batch data that will be updated with reconciliation info
  const [localBatch, setLocalBatch] = useState({});
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const [scannedCrates, setScannedCrates] = useState([]);
  const [manualQrCode, setManualQrCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Get batch ID from route params
  const { batchId } = route.params || {};
  
  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  // Load batch details and stats
  useEffect(() => {
    if (batchId) {
      dispatch(getBatchById(batchId));
      dispatch(getBatchStats(batchId));
      // Fetch reconciliation status directly using the service
      fetchReconciliationStatus();
    }
  }, [batchId, dispatch]);
  
  // Sync Redux batch data to local state
  useEffect(() => {
    if (reduxBatch && reduxBatch.id) {
      setLocalBatch(prevState => ({
        ...prevState,
        ...reduxBatch
      }));
    }
  }, [reduxBatch]);
  
  // State for reconciliation status
  const [reconciliationStatus, setReconciliationStatus] = useState(null);
  
  // Fetch reconciliation status
  const fetchReconciliationStatus = async () => {
    if (!batchId || !localBatch.id) return;
    
    // Only delivered batches can be reconciled
    if (localBatch.status !== 'delivered') {
      // Set default values for non-delivered batches
      setLocalBatch(prevState => ({
        ...prevState,
        reconciliation_status: 'Not applicable',
        is_fully_reconciled: false,
        reconciled_count: 0
      }));
      return;
    }
    
    try {
      const data = await batchService.getReconciliationStatus(batchId);
      console.log('Reconciliation status response:', data);
      setReconciliationStatus(data);
      
      // Update local batch state with reconciliation info
      setLocalBatch(prevState => ({
        ...prevState,
        reconciliation_status: data.reconciliation_status,
        is_fully_reconciled: data.is_fully_reconciled,
        reconciled_count: data.reconciled_count || 0,
        total_crates: data.total_crates || prevState.total_crates || 0
      }));
    } catch (error) {
      console.error('Error fetching reconciliation status:', error);
      
      // Set fallback values in case of error
      setLocalBatch(prevState => ({
        ...prevState,
        reconciliation_status: '0/0 crates (0%)',
        is_fully_reconciled: false
      }));
      
      // Don't show alert for every failed status check to avoid spamming the user
      // Only show an error if this is the first load (reconciliationStatus is null)
      if (reconciliationStatus === null) {
        Alert.alert(
          'Error',
          'Failed to fetch reconciliation status. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    }
  };
  
  // Refresh reconciliation status every 5 seconds
  useEffect(() => {
    // Initial fetch
    fetchReconciliationStatus();
    
    const intervalId = setInterval(() => {
      fetchReconciliationStatus();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [batchId, localBatch.id]);
  
  // Function to determine color based on reconciliation progress
  const getReconciliationColor = (reconciled, total) => {
    if (!total || total === 0) return '#666'; // Default gray for no crates
    
    const percentage = (reconciled / total) * 100;
    
    if (percentage === 0) return '#F44336'; // Red for 0%
    if (percentage < 50) return '#FF9800'; // Orange for < 50%
    if (percentage < 100) return '#2196F3'; // Blue for 50-99%
    return '#4CAF50'; // Green for 100%
  };
  
  // Handle barcode scan
  const handleBarCodeScanned = ({ type, data }) => {
    setScanMode(false);
    
    // Check if this crate has already been scanned
    if (scannedCrates.includes(data)) {
      Alert.alert('Already Scanned', `Crate ${data} has already been scanned.`);
      return;
    }
    
    // Add crate to reconciled list
    Alert.alert(
      'Crate Scanned',
      `Do you want to reconcile crate ${data}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reconcile',
          onPress: () => reconcileCrate(data),
        },
      ]
    );
  };
  
  // Reconcile a crate
  const reconcileCrate = async (qrCode) => {
    try {
      console.log(`Reconciling crate ${qrCode} with batch ${batchId}`);
      
      // Call API to reconcile crate
      const response = await apiClient.post(`/api/batches/${batchId}/reconcile`, {
        qr_code: qrCode
      });
      
      console.log('Reconciliation response:', response.data);
      
      // Add to scanned crates list
      setScannedCrates([...scannedCrates, qrCode]);
      
      // Update local state immediately for better UI responsiveness
      const reconciliationStats = response.data.reconciliation_stats;
      if (reconciliationStats) {
        setLocalBatch(prevState => ({
          ...prevState,
          reconciled_count: reconciliationStats.reconciled_crates || prevState.reconciled_count || 0,
          total_crates: reconciliationStats.total_crates || prevState.total_crates || 0,
          reconciliation_status: `${reconciliationStats.reconciled_crates}/${reconciliationStats.total_crates} crates (${Math.round(reconciliationStats.reconciliation_percentage)}%)`,
          is_fully_reconciled: reconciliationStats.reconciled_crates === reconciliationStats.total_crates
        }));
      }
      
      // Also refresh full reconciliation status from server
      fetchReconciliationStatus();
      
      Alert.alert('Success', `Crate ${qrCode} has been reconciled.`);
    } catch (error) {
      console.error('Error reconciling crate:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Show error message to user
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to reconcile crate. Please try again.'
      );
    }
  };
  
  // Handle closing the batch
  const handleCloseBatch = () => {
    // Check if all crates are reconciled
    if (localBatch.reconciled_count < localBatch.total_crates) {
      Alert.alert(
        'Cannot Close Batch',
        `All crates must be reconciled before closing the batch. Currently ${localBatch.reconciled_count}/${localBatch.total_crates} crates are reconciled.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Close Batch',
      'Are you sure you want to close this batch? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close Batch',
          onPress: () => {
            // Update local state immediately for better UI responsiveness
            setLocalBatch(prevState => ({
              ...prevState,
              status: 'closed',
              is_fully_reconciled: true
            }));
            
            dispatch(closeBatch(batchId))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Batch has been closed successfully');
                navigation.goBack();
              })
              .catch((error) => {
                // Revert local state if there's an error
                setLocalBatch(prevState => ({
                  ...prevState,
                  status: 'delivered'
                }));
                Alert.alert('Error', error.detail || 'Failed to close batch');
              });
          },
        },
      ]
    );
  };
  
  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading reconciliation details...</Text>
      </View>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>
          {error.detail || error.message || 'Failed to load reconciliation details'}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }
  
  // Render if no batch found
  if (!localBatch.id) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="help-circle-outline" size={48} color={theme.colors.placeholder} />
        <Text style={styles.errorText}>Batch not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }
  
  // Check if batch is in valid state for reconciliation
  if (localBatch.status !== 'delivered') {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="information-circle-outline" size={48} color={theme.colors.warning} />
        <Text style={styles.errorText}>
          Batch must be in 'delivered' status to perform reconciliation.
          Current status: {localBatch.status?.replace('_', ' ')}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }
  
  // Render scanner if in scan mode
  if (scanMode) {
    return (
      <View style={styles.scannerContainer}>
        {hasPermission === null ? (
          <Text>Requesting camera permission...</Text>
        ) : hasPermission === false ? (
          <Text>No access to camera</Text>
        ) : (
          <>
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <Text style={styles.scannerText}>Scan Crate QR Code</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setScanMode(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Batch Reconciliation</Text>
        <Chip
          style={[styles.statusChip, { backgroundColor: '#2196F3' }]}
          textStyle={styles.statusText}
        >
          ARRIVED
        </Chip>
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Batch Information</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Batch Code:</Text>
            <Text style={styles.infoValue}>{localBatch.batch_code}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Crates:</Text>
            <Text style={styles.infoValue}>{localBatch.total_crates || 0}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reconciled Crates:</Text>
            <Text style={styles.infoValue}>{localBatch.reconciled_count || 0}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Remaining:</Text>
            <Text style={styles.infoValue}>
              {(localBatch.total_crates || 0) - (localBatch.reconciled_count || 0)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reconciliation:</Text>
            <View style={styles.reconciliationContainer}>
              <Ionicons 
                name={localBatch.is_fully_reconciled ? "checkmark-circle" : "time-outline"} 
                size={18} 
                color={localBatch.is_fully_reconciled ? theme.colors.success : theme.colors.warning} 
                style={styles.reconciliationIcon} 
              />
              <Text 
                style={[styles.infoValue, {
                  color: getReconciliationColor(localBatch.reconciled_count, localBatch.total_crates)
                }]}
              >
                {localBatch.reconciliation_status || '0/0 crates (0%)'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Reconciliation Actions</Title>
          <Divider style={styles.divider} />
          
          <Text style={styles.instructions}>
            Scan each crate's QR code to reconcile it with this batch. Once all crates are reconciled,
            you can close the batch to complete the reconciliation process.
          </Text>
          
          <Button
            mode="contained"
            icon="qrcode-scan"
            onPress={() => setScanMode(true)}
            style={styles.scanButton}
          >
            Scan Crate QR Code
          </Button>
          
          <Button
            mode="outlined"
            icon="keyboard"
            onPress={() => setShowManualEntry(!showManualEntry)}
            style={styles.manualEntryButton}
          >
            {showManualEntry ? 'Hide Manual Entry' : 'Manual QR Entry (Testing)'}
          </Button>
          
          {showManualEntry && (
            <View style={styles.manualEntryContainer}>
              <Text style={styles.manualEntryLabel}>Enter QR Code Manually:</Text>
              <TextInput
                style={styles.manualEntryInput}
                value={manualQrCode}
                onChangeText={setManualQrCode}
                placeholder="Enter crate QR code"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button
                mode="contained"
                onPress={() => {
                  if (manualQrCode.trim()) {
                    reconcileCrate(manualQrCode.trim());
                    setManualQrCode('');
                  } else {
                    Alert.alert('Error', 'Please enter a valid QR code');
                  }
                }}
                style={styles.submitButton}
                disabled={!manualQrCode.trim()}
              >
                Submit
              </Button>
            </View>
          )}
          
          {localBatch.is_fully_reconciled ? (
            <View style={styles.completedContainer}>
              <Text style={styles.completedText}>
                All crates have been reconciled!
              </Text>
              <Button
                mode="contained"
                icon="check-circle"
                onPress={handleCloseBatch}
                style={[styles.closeButton, { backgroundColor: '#4CAF50' }]}
              >
                Complete Reconciliation
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              icon="check-circle"
              onPress={handleCloseBatch}
              style={styles.closeButton}
              disabled={!localBatch.reconciliation_status || localBatch.reconciliation_status.includes('0%')}
            >
              Close Batch
            </Button>
          )}
        </Card.Content>
      </Card>
      
      <View style={styles.scannedContainer}>
        <Title style={styles.scannedTitle}>Recently Scanned Crates</Title>
        {scannedCrates.length === 0 ? (
          <Text style={styles.noScannedText}>No crates scanned yet</Text>
        ) : (
          scannedCrates.map((crate, index) => (
            <Chip
              key={index}
              style={styles.crateChip}
              icon="check-circle"
            >
              {crate}
            </Chip>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    height: 30,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    color: theme.colors.primary,
  },
  divider: {
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  reconciliationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  reconciliationIcon: {
    marginRight: 8,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  scanButton: {
    marginVertical: 8,
    backgroundColor: theme.colors.primary,
  },
  manualEntryButton: {
    marginVertical: 8,
  },
  manualEntryContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  manualEntryLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  manualEntryInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
  },
  closeButton: {
    marginVertical: 8,
    backgroundColor: theme.colors.success,
  },
  completedContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  completedText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  scannedContainer: {
    margin: 16,
  },
  scannedTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  noScannedText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  crateChip: {
    marginVertical: 4,
    backgroundColor: '#e0f2f1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: theme.colors.primary,
  },
  scannerContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  scannerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    marginTop: 50,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 15,
    borderRadius: 5,
    marginBottom: 50,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
});
