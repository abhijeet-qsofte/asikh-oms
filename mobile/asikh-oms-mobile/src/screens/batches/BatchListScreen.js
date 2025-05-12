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
import { getBatches } from '../../store/slices/batchSlice';

export default function BatchListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { batches, loading, error } = useSelector((state) => state.batches);
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  
  // Load batches on component mount
  useEffect(() => {
    console.log('BatchListScreen mounted, loading batches...');
    console.log('Authentication state:', { isAuthenticated, userId: user?.id });
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
  const loadBatches = () => {
    console.log('Dispatching getBatches action...');
    dispatch(getBatches({ page: 1, page_size: 20 }))
      .then(result => {
        console.log('getBatches result:', result);
      })
      .catch(error => {
        console.error('getBatches error:', error);
      });
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(getBatches({ page: 1, page_size: 20 }));
    setRefreshing(false);
  };
  
  // Navigate to batch details
  const handleBatchPress = (batchId) => {
    navigation.navigate('BatchDetail', { batchId });
  };
  
  // Navigate to create batch form
  const handleCreateBatch = () => {
    navigation.navigate('BatchAssign');
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
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Render each batch item
  const renderBatchItem = ({ item }) => (
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
            <Ionicons name="cube-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>Crates: {item.total_crates || 0}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="scale-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>Weight: {item.total_weight || 0} kg</Text>
          </View>
          
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
