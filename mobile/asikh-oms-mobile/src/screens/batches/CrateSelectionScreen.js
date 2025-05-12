// src/screens/batches/CrateSelectionScreen.js
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
import { fetchCrates } from '../../store/slices/crateSlice';
import { addCrateToBatch } from '../../store/slices/batchSlice';
import { format } from 'date-fns';

export default function CrateSelectionScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { crates, loading } = useSelector((state) => state.crates);
  const batchId = route.params?.batchId;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredCrates, setFilteredCrates] = useState([]);
  
  // Load crates on component mount
  useEffect(() => {
    loadCrates();
  }, []);
  
  // Filter crates when search query changes
  useEffect(() => {
    if (crates && crates.length > 0) {
      const filtered = crates.filter(crate => {
        // Only show crates that are not already in a batch
        if (crate.batch_id) return false;
        
        // Apply search filter if there's a query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            (crate.qr_code && crate.qr_code.toLowerCase().includes(query)) ||
            (crate.variety_name && crate.variety_name.toLowerCase().includes(query)) ||
            (crate.farm_name && crate.farm_name.toLowerCase().includes(query))
          );
        }
        return true;
      });
      setFilteredCrates(filtered);
    } else {
      setFilteredCrates([]);
    }
  }, [crates, searchQuery]);
  
  // Load crates from API
  const loadCrates = async () => {
    try {
      await dispatch(fetchCrates({ page: 1, page_size: 50 }));
    } catch (error) {
      console.error('Error loading crates:', error);
      Alert.alert('Error', 'Failed to load crates. Please try again.');
    }
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCrates();
    setRefreshing(false);
  };
  
  // Handle search query change
  const onChangeSearch = query => {
    setSearchQuery(query);
  };
  
  // Handle crate selection
  const handleSelectCrate = (crate) => {
    if (!batchId) {
      Alert.alert('Error', 'No batch selected. Please select a batch first.');
      navigation.goBack();
      return;
    }
    
    // Confirm adding crate to batch
    Alert.alert(
      'Add Crate to Batch',
      `Do you want to add crate ${crate.qr_code} to this batch?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: () => {
            dispatch(addCrateToBatch({ batchId, qrCode: crate.qr_code }))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Crate added to batch successfully');
                navigation.goBack();
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
  
  // Render each crate item
  const renderCrateItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSelectCrate(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>
              Crate #{item.qr_code.split('-').pop()}
            </Title>
            {item.quality_grade && (
              <Chip
                style={[
                  styles.qualityChip,
                  { backgroundColor: getQualityColor(item.quality_grade) },
                ]}
              >
                {item.quality_grade}
              </Chip>
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
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>Farm: {item.farm_name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.cardText}>
              Harvested: {item.harvest_date ? format(new Date(item.harvest_date), 'MMM d, yyyy') : 'Unknown'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
  
  // Get quality grade color
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
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No available crates found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery 
          ? 'Try a different search term' 
          : 'All crates may already be assigned to batches'}
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Crate</Text>
        <Text style={styles.subtitle}>
          Choose an available crate to add to the batch
        </Text>
      </View>
      
      <Searchbar
        placeholder="Search by QR code, variety, or farm"
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading crates...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCrates}
          renderItem={renderCrateItem}
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
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
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
  qualityChip: {
    height: 26,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
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
