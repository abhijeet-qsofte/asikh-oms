// src/screens/batches/BatchScanScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { QRScanner } from '../../components/QRScanner';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { addCrateToBatch, getBatchById, getBatchCrates } from '../../store/slices/batchSlice';
import { Card, Title, Badge } from 'react-native-paper';
import { format } from 'date-fns';

export default function BatchScanScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { currentBatch, batchCrates, loading, error, success } = useSelector(
    (state) => state.batches
  );
  
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get batch ID from route params or use current batch
  const batchId = route.params?.batchId || (currentBatch ? currentBatch.id : null);
  
  // Load batch details and crates if batch ID is available
  useEffect(() => {
    if (batchId) {
      dispatch(getBatchById(batchId));
      dispatch(getBatchCrates({ batchId, params: { page: 1, page_size: 20 } }));
    }
  }, [batchId, dispatch]);
  
  // Handle QR code scan
  const handleScan = (qrCode) => {
    setScanning(false);
    
    if (!batchId) {
      Alert.alert('Error', 'No batch selected. Please create or select a batch first.');
      return;
    }
    
    // Confirm adding crate to batch
    Alert.alert(
      'Add Crate to Batch',
      `Do you want to add crate ${qrCode} to this batch?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: () => {
            dispatch(addCrateToBatch({ batchId, qrCode }))
              .unwrap()
              .then(() => {
                // Refresh crate list after adding
                dispatch(getBatchCrates({ batchId, params: { page: 1, page_size: 20 } }));
              })
              .catch((err) => {
                Alert.alert(
                  'Error',
                  err.detail || err.message || 'Failed to add crate to batch'
                );
              });
          },
        },
      ]
    );
  };
  
  // Start scanning
  const startScanning = () => {
    setScanning(true);
  };
  
  // Stop scanning
  const stopScanning = () => {
    setScanning(false);
  };
  
  // Refresh crate list
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(getBatchCrates({ batchId, params: { page: 1, page_size: 20 } }));
    setRefreshing(false);
  };
  
  // Render each crate item
  const renderCrateItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>
            Crate #{item.qr_code.split('-').pop()}
          </Title>
          {item.quality_grade && (
            <Badge
              style={[
                styles.qualityBadge,
                { backgroundColor: getQualityColor(item.quality_grade) },
              ]}
            >
              {item.quality_grade}
            </Badge>
          )}
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="leaf-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>Variety: {item.variety_name || 'Unknown'}</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="scale-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>Weight: {item.weight || 0} kg</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>
            Harvested: {format(new Date(item.harvest_date), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
  
  // Get quality grade badge color
  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A':
        return '#4CAF50'; // Green
      case 'B':
        return '#2196F3'; // Blue
      case 'C':
        return '#FF9800'; // Orange
      case 'reject':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Render batch info
  const renderBatchInfo = () => {
    if (!currentBatch) return null;
    
    return (
      <Card style={styles.batchCard}>
        <Card.Content>
          <Title style={styles.batchTitle}>Batch: {currentBatch.batch_code}</Title>
          
          <View style={styles.batchInfoRow}>
            <Ionicons name="cube-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.batchInfoText}>
              Crates: {currentBatch.total_crates || 0}
            </Text>
          </View>
          
          <View style={styles.batchInfoRow}>
            <Ionicons name="scale-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.batchInfoText}>
              Total Weight: {currentBatch.total_weight || 0} kg
            </Text>
          </View>
          
          <View style={styles.batchInfoRow}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.batchInfoText}>
              From: {currentBatch.from_location_name} → To: {currentBatch.to_location_name}
            </Text>
          </View>
          
          <View style={styles.batchInfoRow}>
            <Ionicons name="car-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.batchInfoText}>
              Transport: {currentBatch.transport_mode} 
              {currentBatch.vehicle_number ? ` (${currentBatch.vehicle_number})` : ''}
            </Text>
          </View>
          
          <View style={styles.batchActions}>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('BatchDetail', { batchId: currentBatch.id })}
              style={styles.batchButton}
            >
              View Details
            </Button>
            
            <Button
              mode="contained"
              onPress={startScanning}
              style={styles.batchButton}
              icon="qrcode"
            >
              Scan Crate
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No crates in this batch yet</Text>
      <Text style={styles.emptySubtext}>Scan a QR code to add crates to this batch</Text>
    </View>
  );
  
  // If no batch is selected, show a message
  if (!batchId && !currentBatch) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.emptyText}>No Batch Selected</Text>
          <Text style={styles.emptySubtext}>
            Please create a new batch or select an existing one
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('BatchAssign')}
            style={styles.createButton}
          >
            Create New Batch
          </Button>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {scanning ? (
        <QRScanner onScan={handleScan} onClose={stopScanning} />
      ) : (
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {error.detail || error.message || 'An error occurred'}
              </Text>
            </View>
          )}
          
          {renderBatchInfo()}
          
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Crates in Batch</Text>
              <TouchableOpacity onPress={startScanning}>
                <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading crates...</Text>
              </View>
            ) : (
              <FlatList
                data={batchCrates}
                renderItem={renderCrateItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty()}
                onRefresh={onRefresh}
                refreshing={refreshing}
              />
            )}
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
    padding: 16,
  },
  batchCard: {
    marginBottom: 16,
  },
  batchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  batchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  batchInfoText: {
    marginLeft: 8,
    fontSize: 14,
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  batchButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardText: {
    marginLeft: 8,
    fontSize: 14,
  },
  qualityBadge: {
    paddingHorizontal: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    marginTop: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: theme.colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.primary,
  },
});
