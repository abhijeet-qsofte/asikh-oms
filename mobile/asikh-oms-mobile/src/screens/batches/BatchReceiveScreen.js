// src/screens/batches/BatchReceiveScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Card, Title, Paragraph, Divider, Chip, Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { theme } from '../../constants/theme';
import { getBatchByCode, markBatchArrived } from '../../store/slices/batchSlice';

export default function BatchReceiveScreen({ navigation }) {
  const dispatch = useDispatch();
  const { currentBatch, loading, error } = useSelector((state) => state.batches);
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanMode, setScanMode] = useState(true);
  const [batchCode, setBatchCode] = useState(null);
  
  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  // Handle barcode scan
  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScanMode(false);
    setBatchCode(data);
    
    // Get batch details
    dispatch(getBatchByCode(data))
      .unwrap()
      .then(() => {
        console.log('Batch found:', data);
      })
      .catch((error) => {
        Alert.alert('Error', error.detail || 'Batch not found');
        setScanned(false);
      });
  };
  
  // Handle receiving the batch
  const handleReceiveBatch = () => {
    if (!currentBatch) return;
    
    Alert.alert(
      'Receive Batch',
      `Are you sure you want to mark batch ${currentBatch.batch_code} as received at the packhouse?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
        {
          text: 'Receive',
          onPress: () => {
            dispatch(markBatchArrived(currentBatch.id))
              .unwrap()
              .then(() => {
                Alert.alert(
                  'Batch Received',
                  'Batch has been marked as received. Would you like to start reconciliation now?',
                  [
                    {
                      text: 'Later',
                      onPress: () => navigation.goBack(),
                    },
                    {
                      text: 'Start Reconciliation',
                      onPress: () => navigation.navigate('ReconciliationDetail', { batchId: currentBatch.id }),
                    },
                  ]
                );
              })
              .catch((error) => {
                Alert.alert('Error', error.detail || 'Failed to receive batch');
                setScanned(false);
              });
          },
        },
      ]
    );
  };
  
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
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <Text style={styles.scannerText}>Scan Batch QR Code</Text>
              <Text style={styles.scannerSubtext}>
                Position the QR code within the frame to receive the batch
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }
  
  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading batch details...</Text>
      </View>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>
          {error.detail || error.message || 'Failed to load batch details'}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }
  
  // Render if no batch found
  if (!currentBatch) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="help-circle-outline" size={48} color={theme.colors.placeholder} />
        <Text style={styles.errorText}>Batch not found</Text>
        <Button mode="contained" onPress={() => setScanMode(true)} style={styles.scanButton}>
          Scan Again
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }
  
  // Check if batch is already delivered
  if (currentBatch.status === 'delivered') {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Batch Already Received</Title>
            <Divider style={styles.divider} />
            <Paragraph style={styles.paragraph}>
              This batch has already been received at the packhouse.
            </Paragraph>
            <View style={styles.batchInfo}>
              <Text style={styles.infoLabel}>Batch Code:</Text>
              <Text style={styles.infoValue}>{currentBatch.batch_code}</Text>
            </View>
            <View style={styles.batchInfo}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: '#4CAF50' }]}
                textStyle={styles.statusText}
              >
                DELIVERED
              </Chip>
            </View>
            <View style={styles.batchInfo}>
              <Text style={styles.infoLabel}>Arrival Time:</Text>
              <Text style={styles.infoValue}>
                {currentBatch.arrival_time
                  ? new Date(currentBatch.arrival_time).toLocaleString()
                  : 'Not recorded'}
              </Text>
            </View>
            
            <Button
              mode="contained"
              icon="qrcode-scan"
              onPress={() => navigation.navigate('ReconciliationDetail', { batchId: currentBatch.id })}
              style={styles.actionButton}
            >
              Start Reconciliation
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            >
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }
  
  // Render batch details for confirmation
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Receive Batch</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.batchInfo}>
            <Text style={styles.infoLabel}>Batch Code:</Text>
            <Text style={styles.infoValue}>{currentBatch.batch_code}</Text>
          </View>
          
          <View style={styles.batchInfo}>
            <Text style={styles.infoLabel}>From:</Text>
            <Text style={styles.infoValue}>{currentBatch.from_location_name}</Text>
          </View>
          
          <View style={styles.batchInfo}>
            <Text style={styles.infoLabel}>Total Crates:</Text>
            <Text style={styles.infoValue}>{currentBatch.total_crates || 0}</Text>
          </View>
          
          <View style={styles.batchInfo}>
            <Text style={styles.infoLabel}>Total Weight:</Text>
            <Text style={styles.infoValue}>{currentBatch.total_weight || 0} kg</Text>
          </View>
          
          <View style={styles.batchInfo}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Chip
              style={[styles.statusChip, { backgroundColor: '#FF9800' }]}
              textStyle={styles.statusText}
            >
              {currentBatch.status.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>
          
          <Paragraph style={styles.paragraph}>
            Confirm that this batch has arrived at the packhouse. This will mark the batch as
            delivered and allow you to start the reconciliation process.
          </Paragraph>
          
          <Button
            mode="contained"
            icon="check-circle"
            onPress={handleReceiveBatch}
            style={styles.actionButton}
          >
            Receive Batch
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {
              setScanned(false);
              setScanMode(true);
            }}
            style={styles.scanButton}
          >
            Scan Different Batch
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  scannerSubtext: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    textAlign: 'center',
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
    marginTop: 10,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  batchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
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
  statusChip: {
    height: 30,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginVertical: 16,
  },
  actionButton: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
  },
  scanButton: {
    marginTop: 10,
  },
});
