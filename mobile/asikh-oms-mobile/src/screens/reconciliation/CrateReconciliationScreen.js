// src/screens/reconciliation/CrateReconciliationScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Button,
  Text,
  TextInput,
  Card,
  Title,
  Divider,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import apiClient from '../../api/client';
import { theme } from '../../constants/theme';

const CrateReconciliationScreen = ({ route, navigation }) => {
  const { batchId, qrCode, originalWeight } = route.params;
  
  const [cratePhoto, setCratePhoto] = useState(null);
  const [crateWeight, setCrateWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
  
  // Reconcile the crate
  const handleReconcile = async () => {
    // Validate required fields
    if (!cratePhoto) {
      Alert.alert('Photo Required', 'Please take a photo of the crate before reconciling.');
      return;
    }
    
    if (!crateWeight) {
      Alert.alert('Weight Required', 'Please enter the weight of the crate before reconciling.');
      return;
    }
    
    // Validate weight is a valid number
    const weightNum = parseFloat(crateWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid positive number for the weight.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Reconciling crate ${qrCode} with batch ${batchId} with weight ${weightNum}kg`);
      
      // First, upload the photo to get a URL
      let photoUrl = null;
      if (cratePhoto) {
        try {
          // Create a form data object for the photo upload
          const formData = new FormData();
          formData.append('file', {
            uri: cratePhoto,
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
      
      // Navigate back to the reconciliation detail screen with the updated data
      navigation.navigate('ReconciliationDetail', { 
        batchId,
        refreshData: true,
        reconciliationResponse: response.data
      });
      
    } catch (error) {
      console.error('Reconciliation error:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Failed to reconcile crate. Please try again.');
      Alert.alert('Reconciliation Error', error.response?.data?.detail || 'Failed to reconcile crate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate weight differential
  const calculateDifferential = () => {
    if (!crateWeight || !originalWeight) return null;
    
    const currentWeight = parseFloat(crateWeight);
    const origWeight = parseFloat(originalWeight);
    
    if (isNaN(currentWeight) || isNaN(origWeight)) return null;
    
    const differential = currentWeight - origWeight;
    const percentageDiff = origWeight > 0 ? (differential / origWeight) * 100 : 0;
    
    return {
      differential,
      percentageDiff,
      isLoss: differential < 0
    };
  };
  
  const weightDiff = calculateDifferential();
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Crate Reconciliation</Title>
            
            <View style={styles.crateInfoContainer}>
              <Text style={styles.crateLabel}>QR Code:</Text>
              <Text style={styles.crateValue}>{qrCode}</Text>
            </View>
            
            {originalWeight && (
              <View style={styles.crateInfoContainer}>
                <Text style={styles.crateLabel}>Original Weight:</Text>
                <Text style={styles.crateValue}>{originalWeight} kg</Text>
              </View>
            )}
            
            <Divider style={styles.divider} />
            
            <View style={styles.photoSection}>
              <Text style={styles.sectionTitle}>Step 1: Take a Photo of the Crate</Text>
              
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
                <View style={styles.cameraContainer}>
                  <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={48} color={theme.colors.primary} />
                    <Text style={styles.cameraText}>Tap to Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.weightSection}>
              <Text style={styles.sectionTitle}>Step 2: Enter Crate Weight</Text>
              <Text style={styles.weightInstructions}>
                Enter the weight of the crate as measured at the packhouse:
              </Text>
              
              <TextInput
                style={styles.weightInput}
                value={crateWeight}
                onChangeText={handleWeightChange}
                keyboardType="numeric"
                placeholder="Enter weight in kg"
                autoFocus={!cratePhoto} // Focus on weight input if photo is already taken
              />
              
              {weightDiff && (
                <View style={styles.differentialContainer}>
                  <Text style={styles.differentialLabel}>Weight Differential:</Text>
                  <Text style={[
                    styles.differentialValue,
                    { color: weightDiff.isLoss ? '#F44336' : '#4CAF50' }
                  ]}>
                    {weightDiff.differential.toFixed(2)} kg
                    {` (${weightDiff.isLoss ? '-' : '+'}${Math.abs(weightDiff.percentageDiff).toFixed(1)}%)`}
                  </Text>
                </View>
              )}
              
              <Text style={styles.weightNote}>
                Note: This weight will be compared to the original weight recorded at the farm to calculate weight loss.
              </Text>
            </View>
          </Card.Content>
        </Card>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            icon="close"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            icon="check"
            onPress={handleReconcile}
            style={styles.reconcileButton}
            loading={isLoading}
            disabled={isLoading || !cratePhoto || !crateWeight}
          >
            Complete Reconciliation
          </Button>
        </View>
        
        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  crateInfoContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  crateLabel: {
    width: 120,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  crateValue: {
    fontSize: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  photoSection: {
    marginBottom: 16,
  },
  cameraContainer: {
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    marginTop: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  photoPreviewContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  retakeButton: {
    marginTop: 8,
  },
  weightSection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  weightInstructions: {
    fontSize: 14,
    marginBottom: 12,
  },
  weightInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    padding: 12,
    fontSize: 18,
    height: 50,
    marginBottom: 12,
  },
  weightNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
  },
  differentialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
  },
  differentialLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  differentialValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  reconcileButton: {
    flex: 2,
    marginLeft: 8,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});

export default CrateReconciliationScreen;
