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
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Paragraph, Chip, FAB, Button, TextInput, Menu, Divider, IconButton, Portal, Dialog, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, subMonths, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { theme } from '../../constants/theme';
import { TOKEN_KEY } from '../../constants/config';
import { getBatches, getBatchWeightDetails } from '../../store/slices/batchSlice';
import { getFarms, getUsers } from '../../store/slices/adminSlice';

export default function BatchListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { batches, loading, pagination, weightDetails, error } = useSelector((state) => state.batches);
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);
  const { farms, users } = useSelector((state) => state.admin);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  
  // Date filter states
  const [createdDateFilter, setCreatedDateFilter] = useState(null);
  const [departedDateFilter, setDepartedDateFilter] = useState(null);
  const [arrivedDateFilter, setArrivedDateFilter] = useState(null);
  const [dateDialogVisible, setDateDialogVisible] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Menu visibility states
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [farmMenuVisible, setFarmMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  
  // Date picker states
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth());
  const [tempDay, setTempDay] = useState(new Date().getDate());
  const [datePickerMode, setDatePickerMode] = useState('created'); // 'created', 'departed', or 'arrived'
  
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
  
  // Load farms and users for filters
  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(getFarms());
      dispatch(getUsers());
    }
  }, [isAuthenticated, token]);
  
  // Set up navigation header with filter button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon={filtersApplied ? 'filter' : 'filter-outline'}
            color={filtersApplied ? theme.colors.primary : theme.colors.text}
            size={24}
            onPress={toggleFilterModal}
            style={{ marginRight: 8 }}
          />
        </View>
      ),
    });
  }, [navigation, filtersApplied]);
  
  // Load batches from API
  const loadBatches = async () => {
    console.log('Dispatching getBatches action with filters...');
    
    // Build filter parameters
    const params = { page: 1, page_size: 20 };
    
    if (statusFilter) params.status = statusFilter;
    if (farmFilter) params.farm_id = farmFilter;
    if (userFilter) params.created_by = userFilter;
    
    // Add date filters
    if (createdDateFilter) params.created_date = format(createdDateFilter, 'yyyy-MM-dd');
    if (departedDateFilter) params.departed_date = format(departedDateFilter, 'yyyy-MM-dd');
    if (arrivedDateFilter) params.arrived_date = format(arrivedDateFilter, 'yyyy-MM-dd');
    
    console.log('Filter params:', params);
    
    try {
      const result = await dispatch(getBatches(params));
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
    
    // Build filter parameters
    const params = { page: 1, page_size: 20 };
    
    if (statusFilter) params.status = statusFilter;
    if (farmFilter) params.farm_id = farmFilter;
    if (userFilter) params.created_by = userFilter;
    
    // Add date filters
    if (createdDateFilter) params.created_date = format(createdDateFilter, 'yyyy-MM-dd');
    if (departedDateFilter) params.departed_date = format(departedDateFilter, 'yyyy-MM-dd');
    if (arrivedDateFilter) params.arrived_date = format(arrivedDateFilter, 'yyyy-MM-dd');
    
    try {
      const result = await dispatch(getBatches(params));
      
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
  
  // Toggle filter modal
  const toggleFilterModal = () => {
    setFilterVisible(!filterVisible);
  };
  
  // Apply filters
  const applyFilters = () => {
    setFiltersApplied(true);
    setFilterVisible(false);
    loadBatches();
  };
  
  // Reset filters
  const resetFilters = () => {
    setStatusFilter('');
    setFarmFilter('');
    setUserFilter('');
    setCreatedDateFilter(null);
    setDepartedDateFilter(null);
    setArrivedDateFilter(null);
    setFiltersApplied(false);
    setFilterVisible(false);
    
    // Reload batches without filters
    dispatch(getBatches({ page: 1, page_size: 20 }));
  };
  
  // Handle date picker dialog
  const showDatePicker = (mode) => {
    // Set current date values based on existing filter or current date
    let date;
    switch(mode) {
      case 'created':
        date = createdDateFilter || new Date();
        break;
      case 'departed':
        date = departedDateFilter || new Date();
        break;
      case 'arrived':
        date = arrivedDateFilter || new Date();
        break;
      default:
        date = new Date();
    }
    
    setTempYear(date.getFullYear());
    setTempMonth(date.getMonth());
    setTempDay(date.getDate());
    setDatePickerMode(mode);
    setDateDialogVisible(true);
  };
  
  // Handle date selection
  const handleDateConfirm = () => {
    const selectedDate = new Date(tempYear, tempMonth, tempDay);
    
    if (isValid(selectedDate)) {
      switch(datePickerMode) {
        case 'created':
          setCreatedDateFilter(selectedDate);
          break;
        case 'departed':
          setDepartedDateFilter(selectedDate);
          break;
        case 'arrived':
          setArrivedDateFilter(selectedDate);
          break;
      }
      setDateDialogVisible(false);
    }
  };
  
  // Generate month options for picker
  const getMonthOptions = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months.map((month, index) => (
      <Menu.Item 
        key={index} 
        onPress={() => setTempMonth(index)}
        title={month}
        style={tempMonth === index ? { backgroundColor: theme.colors.primaryContainer } : {}}
      />
    ));
  };
  
  // Generate day options for picker
  const getDayOptions = () => {
    const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    return days.map(day => (
      <TouchableRipple
        key={day}
        onPress={() => setTempDay(day)}
        style={[styles.dayButton, tempDay === day ? styles.selectedDay : {}]}
      >
        <Text style={tempDay === day ? styles.selectedDayText : {}}>{day}</Text>
      </TouchableRipple>
    ));
  };
  
  // Quick date selection options
  const setQuickDate = (option) => {
    const today = new Date();
    let selectedDate;
    
    switch(option) {
      case 'today':
        selectedDate = today;
        break;
      case 'yesterday':
        selectedDate = subDays(today, 1);
        break;
      case 'lastWeek':
        selectedDate = subDays(today, 7);
        break;
      case 'lastMonth':
        selectedDate = startOfMonth(subMonths(today, 1));
        break;
      default:
        selectedDate = today;
    }
    
    // Set the date based on the current mode
    switch(datePickerMode) {
      case 'created':
        setCreatedDateFilter(selectedDate);
        break;
      case 'departed':
        setDepartedDateFilter(selectedDate);
        break;
      case 'arrived':
        setArrivedDateFilter(selectedDate);
        break;
    }
    
    setDateDialogVisible(false);
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
            {(() => {
              // Handle different error formats
              if (typeof error === 'string') {
                return error;
              }
              
              if (typeof error === 'object') {
                // Handle message property first (our standardized format)
                if (error.message) {
                  return error.message;
                }
                
                // Handle Pydantic validation errors
                if (error.detail) {
                  if (Array.isArray(error.detail)) {
                    // Format validation errors
                    return error.detail.map(err => {
                      if (typeof err === 'object') {
                        const field = err.loc ? err.loc[err.loc.length - 1] : 'unknown';
                        return `${field}: ${err.msg}`;
                      }
                      return String(err);
                    }).join(', ');
                  }
                  return String(error.detail);
                }
                
                // Fallback to stringify with length limit
                try {
                  return JSON.stringify(error).substring(0, 100);
                } catch (e) {
                  return 'Failed to load batches';
                }
              }
              
              return 'Failed to load batches';
            })()}
          </Text>
        </View>
      )}
      
      {filtersApplied && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>Filters applied</Text>
          <Button 
            mode="text" 
            compact 
            onPress={resetFilters}
            style={styles.clearButton}
          >
            Clear
          </Button>
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
      
      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Batches</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setFilterVisible(false)}
              />
            </View>
            
            <ScrollView>
              {/* Status Filter */}
              <View style={styles.compactFilterRow}>
                <Text style={styles.compactFilterLabel}>Status:</Text>
                <TouchableOpacity 
                  style={styles.compactPickerButton}
                  onPress={() => setStatusMenuVisible(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {statusFilter ? statusFilter.replace('_', ' ').toUpperCase() : 'Select Status'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* Status Dropdown Modal */}
              <Modal
                visible={statusMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setStatusMenuVisible(false)}
              >
                <TouchableOpacity 
                  style={styles.dropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setStatusMenuVisible(false)}
                >
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setStatusFilter('');
                      setStatusMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>All Statuses</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setStatusFilter('open');
                      setStatusMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setStatusFilter('in_transit');
                      setStatusMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>In Transit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setStatusFilter('delivered');
                      setStatusMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>Delivered</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setStatusFilter('closed');
                      setStatusMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>Closed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setStatusFilter('cancelled');
                      setStatusMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>Cancelled</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
              
              {/* Farm Filter */}
              <View style={styles.compactFilterRow}>
                <Text style={styles.compactFilterLabel}>Farm:</Text>
                <TouchableOpacity 
                  style={styles.compactPickerButton}
                  onPress={() => setFarmMenuVisible(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {farmFilter ? farms.find(f => f.id === farmFilter)?.name || 'Select Farm' : 'Select Farm'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* Farm Dropdown Modal */}
              <Modal
                visible={farmMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setFarmMenuVisible(false)}
              >
                <TouchableOpacity 
                  style={styles.dropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setFarmMenuVisible(false)}
                >
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setFarmFilter('');
                      setFarmMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>All Farms</Text>
                    </TouchableOpacity>
                    <View style={styles.dropdownDivider} />
                    {farms.map(farm => (
                      <TouchableOpacity 
                        key={farm.id} 
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFarmFilter(farm.id);
                          setFarmMenuVisible(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{farm.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
              
              {/* User Filter */}
              <View style={styles.compactFilterRow}>
                <Text style={styles.compactFilterLabel}>Created By:</Text>
                <TouchableOpacity 
                  style={styles.compactPickerButton}
                  onPress={() => setUserMenuVisible(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {userFilter ? users.find(u => u.id === userFilter)?.full_name || 'Select User' : 'Select User'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* User Dropdown Modal */}
              <Modal
                visible={userMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setUserMenuVisible(false)}
              >
                <TouchableOpacity 
                  style={styles.dropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setUserMenuVisible(false)}
                >
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setUserFilter('');
                      setUserMenuVisible(false);
                    }}>
                      <Text style={styles.dropdownItemText}>All Users</Text>
                    </TouchableOpacity>
                    <View style={styles.dropdownDivider} />
                    {users.map(user => (
                      <TouchableOpacity 
                        key={user.id} 
                        style={styles.dropdownItem}
                        onPress={() => {
                          setUserFilter(user.id);
                          setUserMenuVisible(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{user.full_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
              
              {/* Date Filters */}
              <View style={styles.compactFilterRow}>
                <Text style={styles.compactFilterLabel}>Created:</Text>
                <TouchableOpacity 
                  style={styles.compactDateButton}
                  onPress={() => showDatePicker('created')}
                >
                  <Text style={styles.dateButtonText}>
                    {createdDateFilter ? format(new Date(createdDateFilter), 'MMM d, yyyy') : 'Select Date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.compactFilterRow}>
                <Text style={styles.compactFilterLabel}>Departed:</Text>
                <TouchableOpacity 
                  style={styles.compactDateButton}
                  onPress={() => showDatePicker('departed')}
                >
                  <Text style={styles.dateButtonText}>
                    {departedDateFilter ? format(new Date(departedDateFilter), 'MMM d, yyyy') : 'Select Date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.compactFilterRow}>
                <Text style={styles.compactFilterLabel}>Arrived:</Text>
                <TouchableOpacity 
                  style={styles.compactDateButton}
                  onPress={() => showDatePicker('arrived')}
                >
                  <Text style={styles.dateButtonText}>
                    {arrivedDateFilter ? format(new Date(arrivedDateFilter), 'MMM d, yyyy') : 'Select Date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.filterButtonContainer}>
                <Button 
                  mode="outlined" 
                  onPress={resetFilters}
                  style={styles.filterButton}
                >
                  Reset
                </Button>
                <Button 
                  mode="contained" 
                  onPress={applyFilters}
                  style={styles.filterButton}
                >
                  Apply
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleCreateBatch}
        color="#fff"
      />
      
      {/* Date Picker Dialog */}
      <Modal
        visible={dateDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDateDialogVisible(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {datePickerMode === 'created' ? 'Select Created Date' : 
                 datePickerMode === 'departed' ? 'Select Departed Date' : 'Select Arrived Date'}
              </Text>
              <TouchableOpacity onPress={() => setDateDialogVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerScrollView}>
              {/* Quick Date Options */}
              <View style={styles.quickDateButtons}>
                <TouchableOpacity 
                  style={styles.quickDateButton} 
                  onPress={() => setQuickDate('today')}
                >
                  <Text style={styles.quickDateText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickDateButton} 
                  onPress={() => setQuickDate('yesterday')}
                >
                  <Text style={styles.quickDateText}>Yesterday</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickDateButton} 
                  onPress={() => setQuickDate('lastWeek')}
                >
                  <Text style={styles.quickDateText}>Last Week</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickDateButton} 
                  onPress={() => setQuickDate('lastMonth')}
                >
                  <Text style={styles.quickDateText}>Last Month</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputRow}>
                <Text style={styles.dateInputLabel}>Year:</Text>
                <TextInput
                  mode="outlined"
                  value={tempYear.toString()}
                  onChangeText={(text) => {
                    const year = parseInt(text);
                    if (!isNaN(year) && year > 1900 && year < 2100) {
                      setTempYear(year);
                    }
                  }}
                  keyboardType="number-pad"
                  style={styles.yearInput}
                  dense
                />
              </View>
              
              {/* Month Selector */}
              <View style={styles.monthPickerContainer}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={[styles.monthButton, tempMonth === index ? styles.selectedMonth : {}]}
                    onPress={() => setTempMonth(index)}
                  >
                    <Text style={[styles.monthText, tempMonth === index ? styles.selectedMonthText : {}]}>{month}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Day Selector */}
              <View style={styles.dayPickerContainer}>
                {getDayOptions()}
              </View>
            </ScrollView>
            
            <View style={styles.datePickerActions}>
              <Button 
                mode="text" 
                onPress={() => setDateDialogVisible(false)}
                style={styles.datePickerButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleDateConfirm}
                style={styles.datePickerButton}
              >
                OK
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    color: theme.colors.placeholder,
  },
  errorContainer: {
    backgroundColor: theme.colors.errorContainer,
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.error,
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
    color: theme.colors.primary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  // Filter styles
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    padding: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  activeFiltersText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  clearButton: {
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  filterLabel: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 12,
  },
  fullWidthDateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
  },
  dateToText: {
    marginHorizontal: 8,
  },
  dialogContainer: {
    zIndex: 1000,
    elevation: 5,
  },
  filterButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  // Compact filter styles
  compactFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactFilterLabel: {
    fontSize: 14,
    width: 80,
  },
  compactPickerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 8,
  },
  compactDateButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 8,
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dropdownContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.outline,
    marginVertical: 8,
  },
  // Date picker dialog styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  datePickerScrollView: {
    maxHeight: 400,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateInputLabel: {
    fontSize: 14,
    width: 50,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  datePickerButton: {
    marginLeft: 8,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  yearInput: {
    marginLeft: 8,
    width: 100,
    height: 40,
  },
  monthPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  monthButton: {
    width: '25%',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 4,
  },
  selectedMonth: {
    backgroundColor: theme.colors.primary,
  },
  selectedMonthText: {
    color: 'white',
    fontWeight: 'bold',
  },
  menuHeader: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  dayPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    padding: 8,
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  quickDateContainer: {
    marginTop: 16,
  },
  quickDateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickDateButton: {
    marginBottom: 8,
    marginRight: 8,
  },
});

// ... (rest of the code remains the same)
