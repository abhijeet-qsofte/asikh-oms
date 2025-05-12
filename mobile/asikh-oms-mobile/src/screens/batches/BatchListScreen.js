// src/screens/batches/BatchListScreen.js
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Paragraph, Chip, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { theme } from '../../constants/theme';
import { TOKEN_KEY } from '../../constants/config';
import { getBatches, getBatchWeightDetails } from '../../store/slices/batchSlice';

export default function BatchListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { batches, loading, pagination, weightDetails, error } = useSelector((state) => state.batches);
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  
  // Load batches on component mount
  useEffect(() => {
    console.log('BatchListScreen mounted, loading batches...');
    console.log('Authentication state:', { isAuthenticated });
    console.log('Auth token available:', !!token);
    
    // Check if user is authenticated before loading batches
    if (isAuthenticated) {
      // Force token refresh if needed
      if (!token) {
        console.log('User is authenticated but token is missing, checking AsyncStorage...');
        AsyncStorage.getItem(TOKEN_KEY)
          .then(storedToken => {
            if (storedToken) {
              console.log('Found token in AsyncStorage, proceeding with batch loading');
              loadBatches();
            } else {
              console.error('No token found in AsyncStorage');
            }
          })
          .catch(err => console.error('Error checking token in AsyncStorage:', err));
      } else {
        loadBatches();
      }
    } else {
      console.error('User not authenticated, cannot load batches');
    }
  }, [isAuthenticated, token]);
  
  // Load batches from API
  const loadBatches = async () => {
    console.log('Dispatching getBatches action...');
    try {
      const result = await dispatch(getBatches({ page: 1, page_size: 20 }));
      console.log('getBatches result:', result);
      
      // For each delivered or closed batch, fetch weight details
      if (result && result.payload && result.payload.batches) {
        const deliveredOrClosedBatches = result.payload.batches.filter(
          batch => batch.status === 'delivered' || batch.status === 'closed'
        );
        
        console.log(`Found ${deliveredOrClosedBatches.length} delivered/closed batches`);
        
        // Use Promise.all to fetch all weight details in parallel
        if (deliveredOrClosedBatches.length > 0) {
          const weightDetailsPromises = deliveredOrClosedBatches.map(batch => {
            console.log(`Fetching weight details for batch ${batch.id}`);
            return dispatch(getBatchWeightDetails(batch.id));
          });
          
          const weightDetailsResults = await Promise.all(weightDetailsPromises);
          console.log('All weight details fetched:', weightDetailsResults);
        }
      }
    } catch (error) {
      console.error('getBatches error:', error);
    }
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await dispatch(getBatches({ page: 1, page_size: 20 }));
      
      // For each delivered or closed batch, fetch weight details
      if (result && result.payload && result.payload.batches) {
        const deliveredOrClosedBatches = result.payload.batches.filter(
          batch => batch.status === 'delivered' || batch.status === 'closed'
        );
        
        console.log(`Found ${deliveredOrClosedBatches.length} delivered/closed batches on refresh`);
        
        // Use Promise.all to fetch all weight details in parallel
        if (deliveredOrClosedBatches.length > 0) {
          const weightDetailsPromises = deliveredOrClosedBatches.map(batch => {
            console.log(`Fetching weight details for batch ${batch.id} on refresh`);
            return dispatch(getBatchWeightDetails(batch.id));
          });
          
          const weightDetailsResults = await Promise.all(weightDetailsPromises);
          console.log('All weight details fetched on refresh:', weightDetailsResults);
        }
      }
    } catch (error) {
      console.error('Error refreshing batches:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Navigate to batch details
  const handleBatchPress = (batchId) => {
    navigation.navigate('BatchDetail', { batchId });
  };
  
  // Handle create batch button press
  const handleCreateBatch = () => {
    navigation.navigate('BatchAssign');
  };
  
  // Handle receive batch button press
  const handleReceiveBatch = () => {
    navigation.navigate('BatchReceiveScreen');
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
      case 'closed':
        return '#673AB7'; // Purple
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Render each batch item
  const renderBatchItem = ({ item }) => {
    console.log(`Rendering batch item: ${item.id}`, item);
    
    // Find weight details for this batch
    let batchWeightDetails = null;
    if (weightDetails && item.id) {
      batchWeightDetails = weightDetails[item.id];
      console.log(`Weight details for batch ${item.id}:`, batchWeightDetails);
    } else {
      console.log(`No weight details found for batch ${item.id}`);
    }
    
    // Use weight details from Redux store if available, otherwise use batch data
    const weightDifferential = batchWeightDetails ? batchWeightDetails.total_weight_differential : item.weight_differential;
    const weightLossPercentage = batchWeightDetails ? batchWeightDetails.weight_loss_percentage : item.weight_loss_percentage;
    
    console.log(`Weight differential for batch ${item.id}: ${weightDifferential}`);
    console.log(`Weight loss percentage for batch ${item.id}: ${weightLossPercentage}`);
    
    return (
    <TouchableOpacity onPress={() => handleBatchPress(item.id)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>{item.batch_code}</Title>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={styles.statusText}
            >
              {item.status.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>QR Code: {item.batch_code}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="cube-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>Crates: {item.total_crates || 0}</Text>
          </View>
          
          {(item.status === 'delivered' || item.status === 'closed') && (
            <View style={styles.cardRow}>
              <Ionicons 
                name={item.status === 'closed' ? "checkmark-done-circle-outline" : "checkmark-circle-outline"} 
                size={18} 
                color={item.status === 'closed' ? theme.colors.primary : theme.colors.success} 
              />
              <Text style={styles.cardText}>
                Reconciliation: {item.reconciliation_status || '0/0 (0%)'}
              </Text>
            </View>
          )}
          
          <View style={styles.cardRow}>
            <Ionicons name="scale-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>Weight: {item.total_weight || 0} kg</Text>
          </View>
          
          {(item.status === 'delivered' || item.status === 'closed') && (
            <View style={styles.cardRow}>
              <Ionicons 
                name={parseFloat(weightDifferential || 0) >= 0 ? "trending-up-outline" : "trending-down-outline"} 
                size={18} 
                color={parseFloat(weightDifferential || 0) >= 0 ? theme.colors.success : theme.colors.error} 
              />
              <Text style={[styles.cardText, {
                color: parseFloat(weightDifferential || 0) >= 0 ? theme.colors.success : theme.colors.error
              }]}>
                Weight Diff: {weightDifferential !== null && weightDifferential !== undefined ? parseFloat(weightDifferential).toFixed(2) : '0.00'} kg
                {weightLossPercentage !== null && weightLossPercentage !== undefined ? 
                  ` (${Math.abs(parseFloat(weightLossPercentage)).toFixed(2)}% ${parseFloat(weightDifferential || 0) < 0 ? 'loss' : 'gain'})` : ''}
              </Text>
            </View>
          )}
          
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>
              From: {item.from_location_name} → To: {item.to_location_name}
            </Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>
              Created: {formatDate(item.created_at)}
            </Text>
          </View>
          
          {item.departure_time && (
            <View style={styles.cardRow}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.cardText}>
                Departed: {formatDate(item.departure_time)}
              </Text>
            </View>
          )}
          
          {item.arrival_time && (
            <View style={styles.cardRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.cardText}>
                Arrived: {formatDate(item.arrival_time)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
  }
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="archive-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No Batches Found</Text>
      <Text style={styles.emptySubtext}>
        Create a new batch to start dispatching crates to the packhouse
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.detail || error.message || 'Failed to load batches'}
          </Text>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading batches...</Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          renderItem={renderBatchItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleCreateBatch}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  card: {
    marginBottom: 16,
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
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 4,
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
