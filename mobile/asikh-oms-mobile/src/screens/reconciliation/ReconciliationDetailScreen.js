// src/screens/reconciliation/ReconciliationDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Paragraph, Divider, Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { getBatchById, closeBatch } from '../../store/slices/batchSlice';
import { getReconciliationStats } from '../../store/slices/reconciliationSlice';
import { format } from 'date-fns';

export default function ReconciliationDetailScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { currentBatch, loading: batchLoading } = useSelector((state) => state.batches);
  const { reconciliationStats, loading: reconciliationLoading } = useSelector((state) => state.reconciliation);
  
  const { qrCode, batchId } = route.params || {};
  const [reconciliationStatus, setReconciliationStatus] = useState('success'); // success, mismatch, or error
  
  const loading = batchLoading || reconciliationLoading;
  
  // Load batch details and reconciliation stats
  useEffect(() => {
    if (batchId) {
      dispatch(getBatchById(batchId));
      dispatch(getReconciliationStats(batchId));
    }
  }, [batchId, dispatch]);
  
  // In a real app, you would fetch the reconciliation details from the API
  // For now, we'll just simulate a successful reconciliation
  
  const getStatusIcon = () => {
    switch (reconciliationStatus) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />;
      case 'mismatch':
        return <Ionicons name="alert-circle" size={80} color="#FF9800" />;
      case 'error':
        return <Ionicons name="close-circle" size={80} color="#F44336" />;
      default:
        return <Ionicons name="help-circle" size={80} color="#9E9E9E" />;
    }
  };
  
  const getStatusTitle = () => {
    switch (reconciliationStatus) {
      case 'success':
        return 'Reconciliation Successful';
      case 'mismatch':
        return 'Reconciliation Mismatch';
      case 'error':
        return 'Reconciliation Failed';
      default:
        return 'Reconciliation Status';
    }
  };
  
  const getStatusDescription = () => {
    switch (reconciliationStatus) {
      case 'success':
        return `Crate ${qrCode} has been successfully reconciled with batch ${currentBatch?.batch_code}.`;
      case 'mismatch':
        return `Crate ${qrCode} was found but has discrepancies with the expected data.`;
      case 'error':
        return `Crate ${qrCode} could not be reconciled with batch ${currentBatch?.batch_code}.`;
      default:
        return 'Unknown reconciliation status.';
    }
  };
  
  const handleScanMore = () => {
    navigation.navigate('ReconciliationScan', { batchId });
  };

  const handleFinish = () => {
    navigation.navigate('ReconciliationList');
  };
  
  const handleCloseBatch = () => {
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
            dispatch(closeBatch(batchId))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Batch closed successfully');
                navigation.navigate('BatchList');
              })
              .catch((err) => {
                Alert.alert(
                  'Error',
                  err.detail || err.message || 'Failed to close batch'
                );
              });
          },
        },
      ]
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading reconciliation details...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.statusContainer}>
        {getStatusIcon()}
        <Text style={styles.statusTitle}>{getStatusTitle()}</Text>
        <Text style={styles.statusDescription}>{getStatusDescription()}</Text>
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Crate Details</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>QR Code:</Text>
            <Text style={styles.detailValue}>{qrCode}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, styles.statusValue]}>Reconciled</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reconciled At:</Text>
            <Text style={styles.detailValue}>{format(new Date(), 'MMM d, yyyy h:mm a')}</Text>
          </View>
        </Card.Content>
      </Card>
      
      {reconciliationStats && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Reconciliation Statistics</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Crates:</Text>
              <Text style={styles.detailValue}>{reconciliationStats.total_crates || 0}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reconciled Crates:</Text>
              <Text style={styles.detailValue}>{reconciliationStats.reconciled_crates || 0}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Missing Crates:</Text>
              <Text style={styles.detailValue}>{reconciliationStats.missing_crates || 0}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Progress:</Text>
              <Text style={styles.detailValue}>
                {reconciliationStats.reconciled_crates || 0}/{reconciliationStats.total_crates || 0} ({Math.round((reconciliationStats.reconciled_crates / reconciliationStats.total_crates || 0) * 100)}%)
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}
      
      {currentBatch && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Batch Details</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Batch Code:</Text>
              <Text style={styles.detailValue}>{currentBatch.batch_code}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From:</Text>
              <Text style={styles.detailValue}>{currentBatch.from_location_name}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To:</Text>
              <Text style={styles.detailValue}>{currentBatch.to_location_name}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{currentBatch.status}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Crates:</Text>
              <Text style={styles.detailValue}>{currentBatch.total_crates}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Weight:</Text>
              <Text style={styles.detailValue}>{currentBatch.total_weight} kg</Text>
            </View>
          </Card.Content>
        </Card>
      )}
      
      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleScanMore} style={styles.button}>
          Scan More Crates
        </Button>
        
        {reconciliationStats && reconciliationStats.is_reconciliation_complete && (
          <Button 
            mode="contained" 
            onPress={handleCloseBatch} 
            style={[styles.button, { backgroundColor: '#4CAF50' }]}
          >
            Close Batch
          </Button>
        )}
        
        <Button mode="outlined" onPress={handleFinish} style={styles.button}>
          Finish Reconciliation
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    color: theme.colors.primary,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  divider: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 2,
  },
  statusValue: {
    color: '#4CAF50',
  },
  buttonContainer: {
    padding: 16,
    marginBottom: 24,
  },
  button: {
    marginVertical: 8,
  },
});
