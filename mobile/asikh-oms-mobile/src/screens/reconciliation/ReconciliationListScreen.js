// src/screens/reconciliation/ReconciliationListScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Searchbar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { getBatches } from '../../store/slices/batchSlice';
import { format } from 'date-fns';

export default function ReconciliationListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { batches, loading } = useSelector((state) => state.batches);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredBatches, setFilteredBatches] = useState([]);
  
  // Load batches on component mount
  useEffect(() => {
    loadBatches();
  }, []);
  
  // Filter batches when search query changes
  useEffect(() => {
    if (batches && batches.length > 0) {
      const filtered = batches.filter(batch => {
        // Only show delivered batches that can be reconciled
        if (batch.status !== 'delivered') return false;
        
        // Apply search filter if there's a query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            (batch.batch_code && batch.batch_code.toLowerCase().includes(query)) ||
            (batch.from_location_name && batch.from_location_name.toLowerCase().includes(query)) ||
            (batch.to_location_name && batch.to_location_name.toLowerCase().includes(query))
          );
        }
        return true;
      });
      setFilteredBatches(filtered);
    } else {
      setFilteredBatches([]);
    }
  }, [batches, searchQuery]);
  
  // Load batches from API
  const loadBatches = async () => {
    try {
      await dispatch(getBatches({ status: 'delivered' }));
    } catch (error) {
      console.error('Error loading batches:', error);
      Alert.alert('Error', 'Failed to load batches. Please try again.');
    }
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadBatches();
    setRefreshing(false);
  };
  
  // Handle search query change
  const onChangeSearch = query => {
    setSearchQuery(query);
  };
  
  // Handle batch selection for reconciliation
  const handleSelectBatch = (batch) => {
    navigation.navigate('ReconciliationScan', { batchId: batch.id });
  };
  
  // Render each batch item
  const renderBatchItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSelectBatch(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>{item.batch_code}</Title>
            <Chip style={styles.statusChip}>
              {item.status}
            </Chip>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>From: {item.from_location_name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>To: {item.to_location_name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="cube-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>Crates: {item.total_crates || 0}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>
              Arrived: {item.arrival_time ? format(new Date(item.arrival_time), 'MMM d, yyyy') : 'Unknown'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="archive-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No delivered batches found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery 
          ? 'Try a different search term' 
          : 'Batches must be marked as delivered before they can be reconciled'}
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Batch for Reconciliation</Text>
        <Text style={styles.subtitle}>
          Choose a delivered batch to reconcile crates
        </Text>
      </View>
      
      <Searchbar
        placeholder="Search by batch code or location"
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading batches...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBatches}
          renderItem={renderBatchItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty()}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchBar: {
    margin: 8,
    elevation: 2,
  },
  listContent: {
    padding: 8,
    paddingBottom: 24,
  },
  card: {
    marginVertical: 6,
    marginHorizontal: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusChip: {
    backgroundColor: theme.colors.primary,
    color: '#fff',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  cardText: {
    marginLeft: 8,
    fontSize: 14,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});
