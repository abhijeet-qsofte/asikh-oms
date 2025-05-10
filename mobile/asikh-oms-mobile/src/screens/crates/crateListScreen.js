// src/screens/crates/CrateListScreen.js
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { fetchCrates, setPage } from '../../store/slices/crateSlice';
import {
  Card,
  Title,
  Paragraph,
  Divider,
  Badge,
  FAB,
} from 'react-native-paper';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function CrateListScreen({ navigation, route }) {
  // Determine which mode we're in based on the route name
  const routeName = route?.name || 'CrateList';
  const isCrateMode = routeName === 'CrateList';
  const isBatchMode = routeName === 'BatchList';
  const isReconciliationMode = routeName === 'ReconciliationList';
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const { crates, loading, error, pagination } = useSelector(
    (state) => state.crates
  );
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    variety_id: null,
    batch_id: null,
    from_date: null,
    to_date: null,
  });

  // Load crates when screen is focused
  useEffect(() => {
    if (isFocused) {
      if (isCrateMode) {
        loadCrates();
      } else if (isBatchMode) {
        // In a real app, we would load batches here
        console.log('Loading batches...');
      } else if (isReconciliationMode) {
        // In a real app, we would load reconciliation data here
        console.log('Loading reconciliation data...');
      }
    }
  }, [isFocused, pagination.page, filters, routeName]);

  // Function to load crates with current pagination and filters
  const loadCrates = async () => {
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
        ...filters,
      };
      await dispatch(fetchCrates(params)).unwrap();
    } catch (error) {
      console.error('Failed to load crates:', error);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCrates();
    setRefreshing(false);
  };

  // Navigate to crate details
  const viewCrateDetails = (crate) => {
    navigation.navigate('CrateDetail', { crate });
  };

  // Handle pagination
  const handleLoadMore = () => {
    if (!loading && pagination.page * pagination.pageSize < pagination.total) {
      dispatch(setPage(pagination.page + 1));
    }
  };

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

  // Render each crate item
  const renderCrateItem = ({ item }) => (
    <TouchableOpacity onPress={() => viewCrateDetails(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>
              Crate #{item.qr_code.split('-').pop()}
            </Title>
            <Badge
              style={[
                styles.qualityBadge,
                { backgroundColor: getQualityColor(item.quality_grade) },
              ]}
            >
              {item.quality_grade}
            </Badge>
          </View>

          <View style={styles.cardRow}>
            <Ionicons
              name="leaf-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.cardText}>Variety: {item.variety_name}</Text>
          </View>

          <View style={styles.cardRow}>
            <Ionicons
              name="scale-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.cardText}>Weight: {item.weight} kg</Text>
          </View>

          <View style={styles.cardRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.cardText}>
              Harvested:{' '}
              {format(new Date(item.harvest_date), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Ionicons
              name="person-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.cardText}>
              Supervisor: {item.supervisor_name}
            </Text>
          </View>

          {item.batch_code && (
            <View style={styles.cardRow}>
              <Ionicons
                name="cube-outline"
                size={18}
                color={theme.colors.primary}
              />
              <Text style={styles.cardText}>Batch: {item.batch_code}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Render footer with loading indicator for pagination
  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading more crates...</Text>
      </View>
    );
  };



  // Render different empty states based on mode
  const renderEmpty = () => {
    if (isBatchMode) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="archive-outline"
            size={64}
            color={theme.colors.placeholder}
          />
          <Text style={styles.emptyText}>No batches found</Text>
          <Text style={styles.emptySubtext}>
            Create a batch to start dispatching crates
          </Text>
        </View>
      );
    } else if (isReconciliationMode) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="checkmark-circle-outline"
            size={64}
            color={theme.colors.placeholder}
          />
          <Text style={styles.emptyText}>No batches to reconcile</Text>
          <Text style={styles.emptySubtext}>
            Select a batch to start reconciliation
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="cube-outline"
            size={64}
            color={theme.colors.placeholder}
          />
          <Text style={styles.emptyText}>No crates found</Text>
          <Text style={styles.emptySubtext}>
            Scan a QR code to start recording crates
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.message || 'An error occurred while loading data'}
          </Text>
        </View>
      )}

      {isCrateMode && (
        <>
          <FlatList
            data={crates}
            renderItem={renderCrateItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={!loading && renderEmpty()}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
          />

          <FAB
            style={styles.fab}
            icon="qrcode"
            label="Scan"
            onPress={() => navigation.navigate('CrateScan')}
          />
        </>
      )}

      {isBatchMode && (
        <>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Batch Management</Text>
            <Text style={styles.emptySubtext}>
              This screen will show batches for dispatch
            </Text>
          </View>

          <FAB
            style={styles.fab}
            icon="archive-plus"
            label="New Batch"
            onPress={() => navigation.navigate('BatchScan')}
          />
        </>
      )}

      {isReconciliationMode && (
        <>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Reconciliation</Text>
            <Text style={styles.emptySubtext}>
              This screen will show batches for reconciliation
            </Text>
          </View>

          <FAB
            style={styles.fab}
            icon="qrcode-scan"
            label="Scan"
            onPress={() => navigation.navigate('ReconciliationScan')}
          />
        </>
      )}
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
    paddingBottom: 80, // Space for FAB
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardText: {
    marginLeft: 8,
    fontSize: 14,
  },
  qualityBadge: {
    paddingHorizontal: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.placeholder,
    marginTop: 8,
    textAlign: 'center',
    marginHorizontal: 30,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 4,
  },
  errorText: {
    color: theme.colors.error,
  },
  footerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 8,
    color: theme.colors.primary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
