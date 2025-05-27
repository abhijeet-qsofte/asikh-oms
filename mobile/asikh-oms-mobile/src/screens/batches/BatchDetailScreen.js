// src/screens/batches/BatchDetailScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Paragraph, Divider, Chip, Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../../components/Button';
// Deep linking removed to fix authentication issues
import { theme } from '../../constants/theme';
import { TOKEN_KEY } from '../../constants/config';
import {
  getBatchById,
  getBatchStats,
  markBatchDeparted,
  markBatchArrived,
  getReconciliationStatus,
} from '../../store/slices/batchSlice';
import { authService } from '../../api/authService';

export default function BatchDetailScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { currentBatch, batchStats, loading, error } = useSelector((state) => state.batches);
  const [refreshing, setRefreshing] = useState(false);
  const [localBatch, setLocalBatch] = useState(null);
  
  // Update local batch state when currentBatch changes
  useEffect(() => {
    if (currentBatch) {
      setLocalBatch(currentBatch);
    }
  }, [currentBatch]);
  
  // Get batch ID from route params
  const { batchId } = route.params || {};
  
  // Function to load batch data
  const loadBatchData = useCallback(async () => {
    if (batchId) {
      try {
        // Import config to check if authentication is required
        const { REQUIRE_AUTHENTICATION } = await import('../../constants/config');
        
        // Only check for token if authentication is required
        if (REQUIRE_AUTHENTICATION) {
          // Check if we're authenticated first
          const token = await AsyncStorage.getItem(TOKEN_KEY);
          if (!token) {
            console.log('No token available, redirecting to login');
            authService.clearAuthAndRedirect(navigation);
            return;
          }
          
          // Set token in headers before dispatching actions
          const apiClient = (await import('../../api/client')).default;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Loading batch data for batch:', batchId);
        
        // Dispatch actions to fetch data
        dispatch(getBatchById(batchId));
        dispatch(getBatchStats(batchId));
        dispatch(getReconciliationStatus(batchId));
      } catch (err) {
        console.error('Error preparing to load batch data:', err);
        // Only redirect to login if authentication is required
        const { REQUIRE_AUTHENTICATION } = await import('../../constants/config');
        if (REQUIRE_AUTHENTICATION) {
          authService.clearAuthAndRedirect(navigation);
        }
      }
    }
  }, [batchId, dispatch, navigation]);
  
  // Load batch details and stats on mount
  useEffect(() => {
    loadBatchData();
  }, [loadBatchData]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      console.log('Error in BatchDetailScreen:', error);
      
      // Import config to check if authentication is required
      const checkAuthRequirement = async () => {
        try {
          const { REQUIRE_AUTHENTICATION } = await import('../../constants/config');
          
          // Only redirect for auth errors if authentication is required
          if (REQUIRE_AUTHENTICATION && (
              error.isAuthError || 
              error.message?.includes('Authentication') || 
              error.message?.includes('auth') || 
              error.response?.status === 401)) {
            console.log('Authentication error detected, redirecting to login');
            authService.clearAuthAndRedirect(navigation);
          } else {
            // For non-auth errors or when auth is not required, just log the error
            console.log('API error occurred but not redirecting:', error.message || 'Unknown error');
          }
        } catch (err) {
          console.error('Error checking authentication requirement:', err);
        }
      };
      
      checkAuthRequirement();
    }
  }, [error, navigation]);
  
  // Authentication check is completely bypassed
  useEffect(() => {
    console.log('Authentication check bypassed in BatchDetailScreen');
    // No authentication check needed
  }, []);
  
  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadBatchData();
    setTimeout(() => setRefreshing(false), 1000);
  };
  
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
        <Text style={styles.errorSubtext}>
          Please check your connection and try again.
        </Text>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()} 
          style={styles.errorButton}
        >
          Go Back
        </Button>
      </View>
    );
  }
  
  // Render if no batch found
  if (!localBatch) {
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
  
  // Safely render batch stats
  const renderBatchStats = () => {
    if (!batchStats || typeof batchStats !== 'object') return null;
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Detailed Statistics</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.statsGrid}>
            {Object.entries(batchStats).map(([key, value]) => {
              // Skip rendering if value is an empty object
              if (value === null || (typeof value === 'object' && Object.keys(value).length === 0)) {
                return null;
              }
              
              // Format the value for display
              let displayValue;
              if (typeof value === 'object') {
                displayValue = JSON.stringify(value);
              } else if (typeof value === 'number') {
                displayValue = value.toString();
              } else if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No';
              } else {
                displayValue = String(value || '0');
              }
              
              return (
                <View key={key} style={styles.gridItem}>
                  <Text style={styles.gridValue}>{displayValue}</Text>
                  <Text style={styles.gridLabel}>
                    {key
                      .replace(/_/g, ' ')
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Batch Details</Text>
        <Chip
          style={[styles.statusChip, { backgroundColor: getStatusColor(localBatch?.status || 'unknown') }]}
          textStyle={styles.statusText}
        >
          {(localBatch?.status || 'unknown').replace('_', ' ').toUpperCase()}
        </Chip>
      </View>
      
      <Card style={styles.qrCard}>
        <Card.Content>
          <View style={styles.qrContainer}>
            <Ionicons name="qr-code" size={28} color={theme.colors.primary} style={styles.qrIcon} />
            <View>
              <Text style={styles.qrLabel}>QR Code</Text>
              <Text style={styles.qrCode}>{localBatch?.batch_code || 'N/A'}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.cardTitle}>Batch Information</Title>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Batch Code:</Text>
            <Text style={styles.infoValue}>{localBatch?.batch_code || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Supervisor:</Text>
            <Text style={styles.infoValue}>{localBatch?.supervisor_name || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(localBatch?.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>From:</Text>
            <Text style={styles.infoValue}>{localBatch?.from_location_name || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>To:</Text>
            <Text style={styles.infoValue}>{localBatch?.to_location_name || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transport:</Text>
            <Text style={styles.infoValue}>{localBatch?.transport_mode || 'N/A'}</Text>
          </View>
          
          {localBatch?.vehicle_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle:</Text>
              <Text style={styles.infoValue}>{localBatch.vehicle_number}</Text>
            </View>
          )}
          
          {localBatch?.driver_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver:</Text>
              <Text style={styles.infoValue}>{localBatch.driver_name}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ETA:</Text>
            <Text style={styles.infoValue}>{formatDate(localBatch?.eta)}</Text>
          </View>
          
          {localBatch?.departure_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Departed:</Text>
              <Text style={styles.infoValue}>{formatDate(localBatch.departure_time)}</Text>
            </View>
          )}
          
          {localBatch?.arrival_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Arrived:</Text>
              <Text style={styles.infoValue}>{formatDate(localBatch.arrival_time)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Batch Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentBatch.total_crates || 0}</Text>
              <Text style={styles.statLabel}>Total Crates</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentBatch.total_weight || 0} kg</Text>
              <Text style={styles.statLabel}>Total Weight</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Render batch stats using the safe rendering function */}
      {renderBatchStats()}
      
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  qrCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    backgroundColor: '#f9f9f9',
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
    color: '#757575',
  },
  qrCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  shareButton: {
    height: 36,
    paddingHorizontal: 8,
  },
  shareButtonText: {
    fontSize: 12,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  gridLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  notes: {
    fontSize: 14,
    color: '#212121',
    lineHeight: 20,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  errorText: {
    fontSize: 18,
    color: '#757575',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    marginHorizontal: 10,
    minWidth: 120,
    marginTop: 10,
  },
  errorBackButton: {
    borderColor: theme.colors.primary,
  },
});
