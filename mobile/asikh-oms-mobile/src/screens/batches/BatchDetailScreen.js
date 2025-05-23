// src/screens/batches/BatchDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Paragraph, Divider, Chip, Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Button from '../../components/Button';
import DeepLinkButton from '../../components/DeepLinkButton';
import { theme } from '../../constants/theme';
import {
  getBatchById,
  getBatchStats,
  markBatchDeparted,
  markBatchArrived,
  getReconciliationStatus,
} from '../../store/slices/batchSlice';

export default function BatchDetailScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { currentBatch, batchStats, loading, error } = useSelector((state) => state.batches);
  
  // Get batch ID from route params
  const { batchId } = route.params || {};
  
  // Load batch details and stats
  useEffect(() => {
    if (batchId) {
      dispatch(getBatchById(batchId));
      dispatch(getBatchStats(batchId));
      dispatch(getReconciliationStatus(batchId));
    }
  }, [batchId, dispatch]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Handle marking batch as departed
  const handleDepart = () => {
    Alert.alert(
      'Mark Batch as Departed',
      'Are you sure you want to mark this batch as departed? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Depart',
          onPress: () => {
            dispatch(markBatchDeparted(batchId))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Batch has been marked as departed');
              })
              .catch((err) => {
                Alert.alert(
                  'Error',
                  err.detail || err.message || 'Failed to mark batch as departed'
                );
              });
          },
        },
      ]
    );
  };
  
  // Handle marking batch as arrived
  const handleArrive = () => {
    Alert.alert(
      'Mark Batch as Arrived',
      'Are you sure you want to mark this batch as arrived at the packhouse? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Arrive',
          onPress: () => {
            dispatch(markBatchArrived(batchId))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Batch has been marked as arrived');
              })
              .catch((err) => {
                Alert.alert(
                  'Error',
                  err.detail || err.message || 'Failed to mark batch as arrived'
                );
              });
          },
        },
      ]
    );
  };
  
  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return '#2196F3'; // Blue
      case 'in_transit':
        return '#FF9800'; // Orange
      case 'delivered':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
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
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Batch Details</Text>
        <Chip
          style={[styles.statusChip, { backgroundColor: getStatusColor(currentBatch.status) }]}
          textStyle={styles.statusText}
        >
          {currentBatch.status.replace('_', ' ').toUpperCase()}
        </Chip>
      </View>
      
      <Card style={styles.qrCard}>
        <Card.Content>
          <View style={styles.qrContainer}>
            <Ionicons name="qr-code" size={28} color={theme.colors.primary} style={styles.qrIcon} />
            <View>
              <Text style={styles.qrLabel}>QR Code</Text>
              <Text style={styles.qrCode}>{currentBatch.batch_code}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.cardTitle}>Batch Information</Title>
            <DeepLinkButton
              routeName="BatchDetail"
              params={{ batchId: currentBatch?.id }}
              title="Share Batch"
              style={styles.shareButton}
              textStyle={styles.shareButtonText}
            />
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Batch Code:</Text>
            <Text style={styles.infoValue}>{currentBatch.batch_code}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Supervisor:</Text>
            <Text style={styles.infoValue}>{currentBatch.supervisor_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(currentBatch.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Crates:</Text>
            <Text style={styles.infoValue}>{currentBatch.total_crates || 0}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Weight:</Text>
            <Text style={styles.infoValue}>{currentBatch.total_weight || 0} kg</Text>
          </View>
          
          {currentBatch.status === 'delivered' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reconciliation:</Text>
                <View style={styles.reconciliationContainer}>
                  <Ionicons 
                    name={currentBatch.is_fully_reconciled ? "checkmark-circle" : "time-outline"} 
                    size={18} 
                    color={currentBatch.is_fully_reconciled ? theme.colors.success : theme.colors.warning} 
                    style={styles.reconciliationIcon} 
                  />
                  <Text style={styles.infoValue}>
                    {currentBatch.reconciliation_status || '0/0 crates (0%)'}
                  </Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                icon="qrcode-scan" 
                onPress={() => navigation.navigate('ReconciliationDetail', { batchId: currentBatch.id })}
                style={styles.reconcileButton}
              >
                Reconcile Crates
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Transport Details</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transport Mode:</Text>
            <Text style={styles.infoValue}>
              {currentBatch.transport_mode ? 
                (currentBatch.transport_mode.charAt(0).toUpperCase() + currentBatch.transport_mode.slice(1)) : 
                'Not specified'}
            </Text>
          </View>
          
          {currentBatch.vehicle_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle Number:</Text>
              <Text style={styles.infoValue}>{currentBatch.vehicle_number}</Text>
            </View>
          )}
          
          {currentBatch.driver_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver:</Text>
              <Text style={styles.infoValue}>{currentBatch.driver_name}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>From:</Text>
            <Text style={styles.infoValue}>{currentBatch.from_location_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>To:</Text>
            <Text style={styles.infoValue}>{currentBatch.to_location_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ETA:</Text>
            <Text style={styles.infoValue}>{formatDate(currentBatch.eta)}</Text>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Shipment Status</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Departure:</Text>
            <Text style={styles.infoValue}>
              {currentBatch.departure_time
                ? formatDate(currentBatch.departure_time)
                : 'Not departed yet'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Arrival:</Text>
            <Text style={styles.infoValue}>
              {currentBatch.arrival_time
                ? formatDate(currentBatch.arrival_time)
                : 'Not arrived yet'}
            </Text>
          </View>
          
          {batchStats && batchStats.transit_time_minutes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transit Time:</Text>
              <Text style={styles.infoValue}>
                {Math.floor(batchStats.transit_time_minutes / 60)} hours{' '}
                {Math.floor(batchStats.transit_time_minutes % 60)} minutes
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      {batchStats && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Batch Statistics</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reconciled Crates:</Text>
              <Text style={styles.infoValue}>
                {batchStats.reconciled_crates} / {batchStats.total_crates} (
                {Math.round(batchStats.reconciliation_percentage)}%)
              </Text>
            </View>
            
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Variety Distribution:</Text>
              {Object.entries(batchStats.variety_distribution).map(([variety, count]) => (
                <View key={variety} style={styles.statItem}>
                  <Text style={styles.statItemLabel}>{variety}:</Text>
                  <Text style={styles.statItemValue}>{count} crates</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Quality Grade Distribution:</Text>
              {Object.entries(batchStats.grade_distribution).map(([grade, count]) => (
                <View key={grade} style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Grade {grade}:</Text>
                  <Text style={styles.statItemValue}>{count} crates</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}
      
      {currentBatch.notes && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Notes</Title>
            <Divider style={styles.divider} />
            <Paragraph style={styles.notes}>{currentBatch.notes}</Paragraph>
          </Card.Content>
        </Card>
      )}
      
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('BatchScan', { batchId: currentBatch.id })}
          style={styles.actionButton}
          icon="qrcode"
        >
          Add Crates
        </Button>
        
        {currentBatch.status === 'open' && (
          <Button
            mode="contained"
            onPress={handleDepart}
            style={styles.actionButton}
            icon="truck"
            loading={loading}
            disabled={loading || currentBatch.total_crates === 0}
          >
            Mark as Departed
          </Button>
        )}
        
        {currentBatch.status === 'in_transit' && (
          <Button
            mode="contained"
            onPress={handleArrive}
            style={styles.actionButton}
            icon="check-circle"
            loading={loading}
            disabled={loading}
          >
            Mark as Arrived
          </Button>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 10,
  },
  shareButtonText: {
    fontSize: 12,
    color: 'white',
  },
  qrCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrIcon: {
    marginRight: 12,
  },
  qrLabel: {
    fontSize: 14,
    color: '#666',
  },
  qrCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  reconciliationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reconciliationIcon: {
    marginRight: 8,
  },
  reconcileButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  infoValue: {
    flex: 2,
    color: theme.colors.text,
  },
  statsSection: {
    marginTop: 16,
  },
  statsSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    paddingLeft: 16,
    marginBottom: 4,
  },
  statItemLabel: {
    flex: 1,
  },
  statItemValue: {
    flex: 1,
  },
  notes: {
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 16,
    paddingTop: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },
  errorButton: {
    width: '50%',
  },
});
