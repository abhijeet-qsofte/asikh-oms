// src/screens/batches/ReconciliationDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Title, Paragraph, Divider, Chip, Button as PaperButton, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
// Removed BarCodeScanner import to avoid native module errors
import Button from '../../components/Button';
import { getBatchById, getBatchStats, markBatchDelivered, closeBatch, getReconciliationStatus, getBatchWeightDetails } from '../../store/slices/batchSlice';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';

const ReconciliationDetailScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Create refs for scrolling
  const crateDetailsRef = React.useRef(null);
  const scrollViewRef = React.useRef(null);
  
  const { currentBatch: batch, loading, error } = useSelector((state) => state.batches);
  const [localBatch, setLocalBatch] = useState({});
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedCrates, setScannedCrates] = useState([]);
  const [manualQrCode, setManualQrCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [crateWeight, setCrateWeight] = useState('');
  const [cratePhoto, setCratePhoto] = useState(null);
  const [currentQrCode, setCurrentQrCode] = useState('');
  const [showCrateDetails, setShowCrateDetails] = useState(false);
  
  // Get batch ID from route params
  const { batchId } = route.params || {};
  
  // Simulated camera permission (no actual camera access needed)
  useEffect(() => {
    // Always set permission to true since we're using a JavaScript-only implementation
    setHasPermission(true);
  }, []);
  
  // Load batch details and stats
  useEffect(() => {
    if (batchId) {
      dispatch(getBatchById(batchId));
      dispatch(getBatchStats(batchId));
      // Fetch reconciliation status directly using the service
      fetchReconciliationStatus();
    }
  }, [batchId, dispatch]);
  
  // Update local batch state when batch data changes
  useEffect(() => {
    if (batch) {
      console.log('Raw batch data:', JSON.stringify(batch, null, 2));
      
      // Get batch details from API to ensure we have complete data
      const fetchBatchDetails = async () => {
        try {
          // Make a direct API call to get full batch details
          const response = await apiClient.get(`/api/batches/${batchId}`);
          const detailedBatch = response.data;
          
          console.log('Detailed batch data:', JSON.stringify(detailedBatch, null, 2));
          
          // Extract farm and packhouse information from location fields
          let farmName = 'Unknown';
          let packhouseName = 'Unknown';
          
          // In the batch API response, from_location is the farm and to_location is the packhouse
          if (detailedBatch.from_location_name) {
            farmName = detailedBatch.from_location_name;
          } else if (detailedBatch.from_location) {
            farmName = `Farm ID: ${detailedBatch.from_location}`;
          }
          
          if (detailedBatch.to_location_name) {
            packhouseName = detailedBatch.to_location_name;
          } else if (detailedBatch.to_location) {
            packhouseName = `Packhouse ID: ${detailedBatch.to_location}`;
          }
          
          // Update local state with complete information
          setLocalBatch(prevState => ({
            ...prevState,
            ...detailedBatch,
            farm_name: farmName,
            packhouse_name: packhouseName,
          }));
          
        } catch (error) {
          console.error('Error fetching detailed batch info:', error);
          
          // Fallback to using the batch data from Redux
          // Use from_location_name as farm and to_location_name as packhouse
          const farmName = batch.from_location_name || 
            (batch.from_location ? `Farm ID: ${batch.from_location}` : 'Unknown');
            
          const packhouseName = batch.to_location_name || 
            (batch.to_location ? `Packhouse ID: ${batch.to_location}` : 'Unknown');
          
          setLocalBatch(prevState => ({
            ...prevState,
            ...batch,
            farm_name: farmName,
            packhouse_name: packhouseName,
          }));
        }
      };
      
      fetchBatchDetails();
    }
  }, [batch, batchId, apiClient]);
  
  // Fetch reconciliation status and weight details
  const fetchReconciliationStatus = async () => {
    try {
      console.log(`Fetching reconciliation status and weight details for batch ${batchId}`);
      
      // Get batch details if not already loaded
      if (!localBatch.id) {
        const batchResponse = await dispatch(getBatchById(batchId)).unwrap();
        setLocalBatch(batchResponse);
      }
      
      // Get reconciliation status
      const reconciliationResponse = await dispatch(getReconciliationStatus(batchId)).unwrap();
      console.log('Reconciliation status response:', reconciliationResponse);
      
      // Get detailed weight information
      const weightDetailsResponse = await dispatch(getBatchWeightDetails(batchId)).unwrap();
      console.log('Weight details response:', weightDetailsResponse);
      
      // Get reconciled crates count
      const reconciledCrates = reconciliationResponse.reconciled_crates || 0;
      
      // Use total_crates from the reconciliation status if available, otherwise from the batch details
      const totalCrates = reconciliationResponse.total_crates || localBatch.total_crates || 0;
      
      const missingCrates = reconciliationResponse.missing_crates || (totalCrates - reconciledCrates);
      const percentage = totalCrates > 0 ? Math.round((reconciledCrates / totalCrates) * 100) : 0;
      
      console.log('Reconciliation counts:', { 
        reconciledCrates, 
        totalCrates, 
        missingCrates, 
        percentage, 
        isFullyReconciled: reconciledCrates === totalCrates && totalCrates > 0 
      });
      
      // Extract weight information from the detailed weight endpoint
      const totalOriginalWeight = weightDetailsResponse.total_original_weight || 0;
      const totalReconciledWeight = weightDetailsResponse.total_reconciled_weight || 0;
      const totalWeightDifferential = weightDetailsResponse.total_weight_differential || 0;
      const weightLossPercentage = weightDetailsResponse.weight_loss_percentage || 0;
      
      console.log('Weight information from details endpoint:', {
        totalOriginalWeight,
        totalReconciledWeight,
        totalWeightDifferential,
        weightLossPercentage
      });
      
      setLocalBatch(prevState => ({
        ...prevState,
        reconciled_count: reconciledCrates,
        total_crates: totalCrates,
        missing_crates: missingCrates,
        reconciliation_status: `${reconciledCrates}/${totalCrates} crates (${percentage}%)`,
        is_fully_reconciled: reconciledCrates === totalCrates && totalCrates > 0,
        total_original_weight: totalOriginalWeight,
        total_reconciled_weight: totalReconciledWeight,
        total_weight_differential: totalWeightDifferential,
        weight_loss_percentage: weightLossPercentage,
        crate_details: weightDetailsResponse.crate_details || []
      }));
      
      console.log('Batch state updated with reconciliation and weight details');
    } catch (error) {
      console.error('Error fetching reconciliation status or weight details:', error);
      
      // If we fail to get the data, use the batch data for total crates
      if (localBatch.total_crates) {
        setLocalBatch(prevState => ({
          ...prevState,
          reconciled_count: 0,
          total_crates: prevState.total_crates,
          missing_crates: prevState.total_crates,
          reconciliation_status: `0/${prevState.total_crates} crates (0%)`,
          is_fully_reconciled: false,
        }));
      }
    }
  };
  
  useEffect(() => {
    // Initial fetch
    fetchReconciliationStatus();
    
    const intervalId = setInterval(() => {
      fetchReconciliationStatus();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [batchId, localBatch.id]);
  
  // Function to determine color based on reconciliation progress
  const getReconciliationColor = (reconciled, total) => {
    if (!total || total === 0) return '#666'; // Default gray for no crates
    
    const percentage = (reconciled / total) * 100;
    
    if (percentage === 0) return '#F44336'; // Red for 0%
    if (percentage < 50) return '#FF9800'; // Orange for < 50%
    if (percentage < 100) return '#2196F3'; // Blue for 50-99%
    return '#4CAF50'; // Green for 100%
  };
  
  // Handle barcode scan
  const handleBarCodeScanned = ({ data }) => {
    setScanning(false);
    setCurrentQrCode(data);
    setShowCrateDetails(true);
    
    // Show a brief confirmation toast or notification
    console.log(`Crate scanned: ${data}`);
    
    // Automatically scroll to the crate details section
    setTimeout(() => {
      if (crateDetailsRef && crateDetailsRef.current) {
        // For React Native, we need to use scrollTo instead of scrollIntoView
        // This will be handled by the ScrollView containing the ref
        crateDetailsRef.current.measure((fx, fy, width, height, px, py) => {
          // The measure callback gives us the position on screen
          // We can use this to scroll to the right position
          if (py) {
            // Get the scrollview ref and scroll to this position
            if (scrollViewRef && scrollViewRef.current) {
              scrollViewRef.current.scrollTo({ y: py, animated: true });
            }
          }
        });
      }
    }, 100);
  };
  
  // Handle taking a photo
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCratePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };
  
  // Handle weight change
  const handleWeightChange = (text) => {
    // Only allow numbers and decimal point
    const filteredText = text.replace(/[^0-9.]/g, '');
    setCrateWeight(filteredText);
  };
  
  // Reconcile a crate
  const reconcileCrate = async (qrCode, photoUri, weight) => {
    // Validate required fields
    if (!photoUri) {
      Alert.alert('Photo Required', 'Please take a photo of the crate before reconciling.');
      return;
    }
    
    if (!weight) {
      Alert.alert('Weight Required', 'Please enter the weight of the crate before reconciling.');
      return;
    }
    
    // Validate weight is a valid number
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid positive number for the weight.');
      return;
    }
    
    try {
      console.log(`Reconciling crate ${qrCode} with batch ${batchId} with weight ${weightNum}kg`);
      
      // First, upload the photo to get a URL
      let photoUrl = null;
      if (photoUri) {
        try {
          // Create a form data object for the photo upload
          const formData = new FormData();
          formData.append('file', {
            uri: photoUri,
            type: 'image/jpeg',
            name: `crate_${qrCode}_${Date.now()}.jpg`
          });
          
          // Upload the photo
          const uploadResponse = await apiClient.post('/api/uploads/crate-photos', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          // Get the photo URL from the response
          photoUrl = uploadResponse.data.url;
          console.log('Photo uploaded successfully:', photoUrl);
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          // Continue with reconciliation even if photo upload fails
          Alert.alert('Photo Upload Failed', 'Continuing with reconciliation without photo.');
        }
      }
      
      // Call API to reconcile crate with weight and photo URL (if available)
      const response = await apiClient.post(`/api/batches/${batchId}/reconcile`, {
        qr_code: qrCode,
        weight: weightNum, // Send as a number, not a string
        photo_url: photoUrl
      });
      
      console.log('Reconciliation response:', response.data);
      
      // Add to scanned crates list
      setScannedCrates([...scannedCrates, qrCode]);
      
      // Reset photo and weight after successful reconciliation
      setCratePhoto(null);
      setCrateWeight('');
      setCurrentQrCode('');
      
      // Update local state immediately for better UI responsiveness
      const reconciliationStats = response.data.reconciliation_stats;
      if (reconciliationStats) {
        setLocalBatch(prevState => ({
          ...prevState,
          reconciled_count: reconciliationStats.reconciled_crates,
          total_crates: reconciliationStats.total_crates,
          missing_crates: reconciliationStats.missing_crates,
          reconciliation_status: `${reconciliationStats.reconciled_crates}/${reconciliationStats.total_crates} crates (${Math.round(reconciliationStats.reconciliation_percentage)}%)`,
          is_fully_reconciled: reconciliationStats.reconciled_crates === reconciliationStats.total_crates,
          total_original_weight: reconciliationStats.total_original_weight,
          total_reconciled_weight: reconciliationStats.total_reconciled_weight,
          total_weight_differential: reconciliationStats.total_weight_differential,
          weight_loss_percentage: reconciliationStats.weight_loss_percentage
        }));
      }
      
      // Show success message
      Alert.alert('Success', `Crate ${qrCode} has been reconciled successfully.`);
    } catch (error) {
      console.error('Error reconciling crate:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reconcile crate. Please try again.');
    }
  };
  
  // Handle marking batch as delivered after reconciliation
  const handleMarkAsDelivered = () => {
    // Check if any crates have been reconciled
    if (!localBatch.reconciled_count || localBatch.reconciled_count === 0) {
      Alert.alert(
        'Cannot Mark as Delivered',
        'You must reconcile at least one crate before marking the batch as delivered.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if all crates are reconciled
    if (localBatch.reconciled_count < localBatch.total_crates) {
      // Do not allow batch to be marked as delivered if not all crates are reconciled
      Alert.alert(
        'Incomplete Reconciliation',
        `Only ${localBatch.reconciled_count} out of ${localBatch.total_crates} crates have been reconciled. You must reconcile all crates before marking the batch as delivered.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // All crates are reconciled, confirm marking as delivered
    Alert.alert(
      'Complete Reconciliation',
      'All crates have been reconciled. Would you like to mark the batch as DELIVERED?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as DELIVERED',
          onPress: markAsDelivered
        }
      ]
    );
  };
  
  // Handle closing the batch after it has been delivered
  const handleCloseBatch = () => {
    // Confirm batch closure
    Alert.alert(
      'Close Batch',
      'Are you sure you want to close this batch? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Close Batch',
          onPress: completeCloseBatch
        }
      ]
    );
  };
  
  // Function to mark batch as delivered after reconciliation is complete
  const markAsDelivered = () => {
    // Update local state immediately for better UI responsiveness
    setLocalBatch(prevState => ({
      ...prevState,
      status: 'DELIVERED',
      is_fully_reconciled: true
    }));
    
    dispatch(markBatchDelivered(batchId))
      .unwrap()
      .then(() => {
        Alert.alert('Success', 'Batch has been successfully reconciled and marked as DELIVERED');
        // Refresh batch data
        dispatch(getBatchById(batchId));
      })
      .catch((error) => {
        // Revert local state if there's an error
        setLocalBatch(prevState => ({
          ...prevState,
          status: 'ARRIVED',
          is_fully_reconciled: false
        }));
        Alert.alert('Error', error.message || 'Failed to mark batch as delivered');
      });
  };
  
  // Function to close the batch after it has been delivered
  const completeCloseBatch = () => {
    // Update local state immediately for better UI responsiveness
    setLocalBatch(prevState => ({
      ...prevState,
      status: 'CLOSED'
    }));
    
    dispatch(closeBatch(batchId))
      .unwrap()
      .then(() => {
        Alert.alert('Success', 'Batch has been successfully closed');
        navigation.goBack();
      })
      .catch((error) => {
        // Revert local state if there's an error
        setLocalBatch(prevState => ({
          ...prevState,
          status: 'DELIVERED'
        }));
        Alert.alert('Error', error.message || 'Failed to close batch');
      });
  };
  
  // Render loading state
  if (loading && !localBatch.id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading batch details...</Text>
      </View>
    );
  }
  
  // Render error state
  if (error && !localBatch.id) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Error loading batch details</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerContainer}>
              <Title style={styles.title}>Batch Reconciliation</Title>
              <Chip
                mode="outlined"
                style={[styles.statusChip, { backgroundColor: '#2196F3' }]}
              >
                ARRIVED
              </Chip>
            </View>
            
            <Divider style={styles.divider} />
            
            <Title style={styles.sectionTitle}>Batch Information</Title>
            
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Batch Code:</Text>
                <Text style={styles.infoValue}>{localBatch.batch_code || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Farm:</Text>
                <Text style={styles.infoValue}>{localBatch.farm_name || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Packhouse:</Text>
                <Text style={styles.infoValue}>{localBatch.packhouse_name || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {localBatch.created_at ? new Date(localBatch.created_at).toLocaleString() : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Crates:</Text>
                <Text style={styles.infoValue}>{localBatch.total_crates || 0}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reconciled:</Text>
                <Text style={styles.infoValue}>{localBatch.reconciled_count || 0}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Remaining:</Text>
                <Text style={styles.infoValue}>{localBatch.missing_crates || 0}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reconciliation:</Text>
                <Ionicons 
                  name={localBatch.is_fully_reconciled ? 'checkmark-circle' : 'time-outline'} 
                  size={24} 
                  color={getReconciliationColor(localBatch.reconciled_count, localBatch.total_crates)} 
                  style={styles.reconciliationIcon} 
                />
                <Text 
                  style={[styles.infoValue, {
                    color: getReconciliationColor(localBatch.reconciled_count, localBatch.total_crates)
                  }]}
                >
                  {localBatch.reconciliation_status || '0/0 crates (0%)'}
                </Text>
              </View>
              
              <Divider style={[styles.divider, { marginVertical: 10 }]} />
              
              <Text style={styles.sectionTitle}>Weight Information</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Original Weight:</Text>
                <Text style={styles.infoValue}>{localBatch.total_original_weight || 0} kg</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reconciled Weight:</Text>
                <Text style={styles.infoValue}>{localBatch.total_reconciled_weight || 0} kg</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Weight Differential:</Text>
                <Text style={[styles.infoValue, {
                  color: (localBatch.total_weight_differential || 0) < 0 ? '#F44336' : '#4CAF50'
                }]}>
                  {localBatch.total_weight_differential || 0} kg
                  {localBatch.total_weight_differential !== 0 && ` (${Math.abs(localBatch.weight_loss_percentage || 0)}% ${(localBatch.total_weight_differential || 0) < 0 ? 'loss' : 'gain'})`}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {localBatch.crate_details && localBatch.crate_details.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Crate Weight Details</Title>
              <Divider style={styles.divider} />
              
              <ScrollView horizontal={true} style={styles.tableContainer}>
                <View>
                  {/* Table Header */}
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableHeader, { width: 120 }]}>QR Code</Text>
                    <Text style={[styles.tableHeader, { width: 100 }]}>Original (kg)</Text>
                    <Text style={[styles.tableHeader, { width: 100 }]}>Reconciled (kg)</Text>
                    <Text style={[styles.tableHeader, { width: 100 }]}>Differential (kg)</Text>
                  </View>
                  
                  {/* Table Rows */}
                  {localBatch.crate_details.map((crate, index) => (
                    <View key={crate.crate_id} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                      <Text style={[styles.tableCell, { width: 120 }]}>{crate.qr_code}</Text>
                      <Text style={[styles.tableCell, { width: 100 }]}>{crate.original_weight || 0}</Text>
                      <Text style={[styles.tableCell, { width: 100 }]}>{crate.reconciled_weight || 'N/A'}</Text>
                      <Text style={[styles.tableCell, { width: 100, color: (crate.weight_differential || 0) < 0 ? theme.colors.error : theme.colors.success }]}>
                        {crate.weight_differential || 0}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card.Content>
          </Card>
        )}
        
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Reconciliation Actions</Title>
            <Divider style={styles.divider} />
            
            <Text style={styles.instructions}>
              Scan each crate's QR code to reconcile it with this batch. Once all crates are reconciled,
              you can close the batch to complete the reconciliation process.
            </Text>
            
            {scanning ? (
              <View style={styles.scannerContainer}>
                <View style={styles.scanner}>
                  <View style={styles.mockScannerFrame}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.simulateScanButton}
                    onPress={() => {
                      // Generate a test crate code
                      const testCrateCode = `CR-${new Date().getMonth()+1}${new Date().getDate()}${new Date().getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
                      handleBarCodeScanned({ type: 'QR', data: testCrateCode });
                    }}
                  >
                    <Text style={styles.simulateScanButtonText}>Simulate Scan</Text>
                  </TouchableOpacity>
                </View>
                <Button
                  mode="contained"
                  icon="close"
                  onPress={() => setScanning(false)}
                  style={styles.cancelButton}
                >
                  Cancel Scan
                </Button>
              </View>
            ) : currentQrCode ? (
              <View 
                ref={crateDetailsRef} 
                style={[styles.reconciliationContainer, styles.highlightedSection]}
              >
                <Title style={styles.detailsTitle}>Crate Reconciliation Details</Title>
                <Text style={styles.qrCodeText}>QR Code: {currentQrCode}</Text>
                
                <View style={styles.photoContainer}>
                  <Text style={styles.sectionTitle}>Crate Photo</Text>
                  {cratePhoto ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: cratePhoto }} style={styles.photoPreview} />
                      <Button 
                        mode="outlined" 
                        icon="camera" 
                        onPress={handleTakePhoto}
                        style={styles.retakeButton}
                      >
                        Retake Photo
                      </Button>
                    </View>
                  ) : (
                    <Button 
                      mode="contained" 
                      icon="camera" 
                      onPress={handleTakePhoto}
                      style={styles.photoButton}
                    >
                      Take Photo
                    </Button>
                  )}
                </View>
                
                <View style={styles.weightContainer}>
                  <Text style={[styles.sectionTitle, { fontSize: 18, color: '#2196F3' }]}>Crate Weight (kg) *</Text>
                  <Text style={styles.weightInstructions}>Enter the weight of the crate as measured at the packhouse:</Text>
                  <TextInput
                    style={[styles.weightInput, { borderWidth: 2, borderColor: '#2196F3', height: 50, fontSize: 18 }]}
                    value={crateWeight}
                    onChangeText={handleWeightChange}
                    keyboardType="numeric"
                    placeholder="Enter weight in kg"
                    autoFocus={true} // Automatically focus on weight input
                  />
                  <Text style={styles.weightNote}>Note: This weight will be compared to the original weight recorded at the farm to calculate weight loss.</Text>
                </View>
                
                <View style={styles.buttonContainer}>
                  <Button
                    mode="outlined"
                    icon="close"
                    onPress={() => {
                      setCurrentQrCode('');
                      setCratePhoto(null);
                      setCrateWeight('');
                      setShowCrateDetails(false);
                    }}
                    style={styles.cancelReconcileButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    icon="check"
                    onPress={() => reconcileCrate(currentQrCode, cratePhoto, crateWeight)}
                    style={styles.reconcileButton}
                    disabled={!cratePhoto || !crateWeight}
                  >
                    Reconcile Crate
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.actionsContainer}>
                <Button
                  mode="contained"
                  icon="qrcode-scan"
                  onPress={() => setScanning(true)}
                  style={styles.scanButton}
                >
                  Scan QR Code
                </Button>
                
                <Button
                  mode="outlined"
                  icon="form-textbox"
                  onPress={() => setShowManualEntry(!showManualEntry)}
                  style={styles.manualButton}
                >
                  {showManualEntry ? 'Hide Manual Entry' : 'Manual QR Entry'}
                </Button>
              </View>
            )}
            
            {showManualEntry && (
              <View style={styles.manualEntryContainer}>
                <Text style={styles.manualEntryLabel}>Enter QR Code Manually:</Text>
                <TextInput
                  style={styles.manualEntryInput}
                  value={manualQrCode}
                  onChangeText={setManualQrCode}
                  placeholder="Enter crate QR code"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  mode="contained"
                  onPress={() => {
                    if (manualQrCode.trim()) {
                      setCurrentQrCode(manualQrCode.trim());
                      setManualQrCode('');
                      setShowManualEntry(false); // Hide manual entry after submitting
                      
                      // Scroll to the crate details section after a short delay
                      setTimeout(() => {
                        if (crateDetailsRef && crateDetailsRef.current) {
                          crateDetailsRef.current.measureInWindow((x, y, width, height) => {
                            if (scrollViewRef && scrollViewRef.current) {
                              scrollViewRef.current.scrollTo({ y: y, animated: true });
                            }
                          });
                        }
                      }, 100);
                    } else {
                      Alert.alert('Error', 'Please enter a valid QR code');
                    }
                  }}
                  style={styles.submitButton}
                  disabled={!manualQrCode.trim()}
                >
                  Submit
                </Button>
              </View>
            )}
            
            {localBatch.status === 'ARRIVED' && (
              <View>
                {localBatch.is_fully_reconciled ? (
                  <View style={styles.completedContainer}>
                    <Text style={styles.completedText}>
                      All crates have been reconciled!
                    </Text>
                    <Button
                      mode="contained"
                      icon="check-circle"
                      onPress={handleMarkAsDelivered}
                      style={[styles.closeButton, { backgroundColor: '#4CAF50' }]}
                    >
                      Mark as DELIVERED
                    </Button>
                  </View>
                ) : (
                  <View>
                    <Button
                      mode="contained"
                      icon="check-circle"
                      onPress={handleMarkAsDelivered}
                      style={styles.closeButton}
                      disabled={!localBatch.reconciled_count || localBatch.reconciled_count === 0}
                    >
                      {localBatch.reconciled_count === 0 ? 'No Crates Reconciled' : 
                       `${localBatch.reconciled_count}/${localBatch.total_crates} Crates Reconciled`}
                    </Button>
                    <Text style={styles.reconciliationNote}>
                      All crates must be reconciled before the batch can be marked as DELIVERED.
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {localBatch.status === 'DELIVERED' && (
              <View style={styles.completedContainer}>
                <Text style={styles.completedText}>
                  Batch has been fully reconciled and marked as DELIVERED!
                </Text>
                <Button
                  mode="contained"
                  icon="archive"
                  onPress={handleCloseBatch}
                  style={[styles.closeButton, { backgroundColor: '#2196F3' }]}
                >
                  Close Batch
                </Button>
              </View>
            )}
            
            {localBatch.status === 'CLOSED' && (
              <View style={styles.completedContainer}>
                <Text style={styles.completedText}>
                  Batch has been closed and archived.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  highlightedSection: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  tableContainer: {
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  tableRowOdd: {
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    fontWeight: 'bold',
    paddingHorizontal: 8,
    color: theme.colors.primary,
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 30,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  reconciliationIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    marginVertical: 12,
    fontSize: 14,
    color: '#666',
  },
  scannerContainer: {
    height: 300,
    marginVertical: 16,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  scanner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockScannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.primary,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.primary,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.primary,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.primary,
  },
  simulateScanButton: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  simulateScanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: theme.colors.error,
  },
  actionsContainer: {
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanButton: {
    flex: 1,
    marginRight: 8,
  },
  manualButton: {
    flex: 1,
    marginLeft: 8,
  },
  manualEntryContainer: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  manualEntryInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  submitButton: {
    alignSelf: 'flex-end',
  },
  reconciliationContainer: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoButton: {
    marginTop: 8,
  },
  retakeButton: {
    marginTop: 8,
  },
  weightContainer: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  weightInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  weightInstructions: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  weightNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelReconcileButton: {
    flex: 1,
    marginRight: 8,
  },
  reconcileButton: {
    flex: 1,
    marginLeft: 8,
  },
  closeButton: {
    marginTop: 16,
  },
  completedContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  completedText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  reconciliationNote: {
    fontSize: 14,
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  errorMessage: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ReconciliationDetailScreen;
