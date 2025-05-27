// src/screens/crates/CrateFormScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image, Text, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';
import TextInput from '../../components/TextInput';
import Button from '../../components/Button';
import { theme } from '../../constants/theme';
import { createCrate } from '../../store/slices/crateSlice';
import { getVarieties } from '../../store/slices/adminSlice';
import { Ionicons } from '@expo/vector-icons';
import imageService from '../../services/imageService';

// Form validation schema
const CrateSchema = Yup.object().shape({
  qr_code: Yup.string().required('QR Code is required'),
  variety_id: Yup.string().required('Variety is required'),
  weight: Yup.number()
    .required('Weight is required')
    .positive('Weight must be positive')
    .typeError('Weight must be a number'),
  quality_grade: Yup.string().required('Quality grade is required'),
  notes: Yup.string(),
});

export default function CrateFormScreen({ route, navigation }) {
  const { qrCode } = route.params || {};
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.crates);
  const currentUser = useSelector((state) => state.auth.user);

  const [location, setLocation] = useState(null);
  const [locationDisplay, setLocationDisplay] = useState('');
  const [photo, setPhoto] = useState(null);
  const [varieties, setVarieties] = useState([]);
  const [loadingVarieties, setLoadingVarieties] = useState(false);

  // Fetch varieties from the database
  useEffect(() => {
    const fetchVarieties = async () => {
      try {
        setLoadingVarieties(true);
        const result = await dispatch(getVarieties());
        if (result.payload) {
          console.log('Fetched varieties:', result.payload);
          setVarieties(result.payload);
        }
      } catch (error) {
        console.error('Error fetching varieties:', error);
        Alert.alert('Error', 'Failed to load mango varieties');
      } finally {
        setLoadingVarieties(false);
      }
    };
    
    fetchVarieties();
  }, [dispatch]);
  
  // Get the user's location on component mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation.coords);
      
      // Use reverse geocoding to get the city name
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        
        if (geocode && geocode.length > 0) {
          const { city, district, subregion, region } = geocode[0];
          // Use the most specific location available
          const locationName = city || district || subregion || region || 'Unknown';
          setLocationDisplay(
            `${locationName} (${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)})`
          );
        } else {
          setLocationDisplay(
            `(${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)})`
          );
        }
      } catch (error) {
        console.log('Error getting location name:', error);
        setLocationDisplay(
          `(${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)})`
        );
      }
    })();
  }, []);

  // Handler for taking a photo
  const takePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission is required to take photos');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,  // Reduced quality to decrease file size
        base64: true,
      });

      if (!result.canceled) {
        // Use our image service to process the image
        const processedImageData = await imageService.processImage(result.assets[0]);
        
        // Store the processed image
        setPhoto({
          ...result.assets[0],
          processedImageData
        });
        
        console.log('Photo captured and processed successfully');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error taking photo: ' + error.message);
    }
  };

  // Handler for picking a photo from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Gallery permission is required to select photos');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,  // Reduced quality to decrease file size
        base64: true,
      });

      if (!result.canceled) {
        // Use our image service to process the image
        const processedImageData = await imageService.processImage(result.assets[0]);
        
        // Store the processed image
        setPhoto({
          ...result.assets[0],
          processedImageData
        });
        
        console.log('Photo selected from gallery and processed successfully');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error selecting photo: ' + error.message);
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    if (!location) {
      Alert.alert(
        'Location Required',
        'Please wait until your location is determined.'
      );
      return;
    }

    // Show loading indicator
    Alert.alert(
      'Processing',
      'Creating crate record... This may take a moment.',
      [{ text: 'OK' }]
    );

    // Process photo for two-step upload using our image service
    let photoBase64 = undefined;
    
    if (photo) {
      console.log('Image will be uploaded in a separate request after crate creation');
      // Use either the processed image data or the original base64 data
      if (photo.processedImageData) {
        photoBase64 = photo.processedImageData;
      } else if (photo.base64) {
        photoBase64 = `data:image/jpeg;base64,${photo.base64}`;
      }
    }

    // Prepare crate data for API
    const crateData = {
      qr_code: values.qr_code,
      variety_id: values.variety_id,
      weight: parseFloat(values.weight),
      quality_grade: values.quality_grade,
      notes: values.notes,
      // Use hardcoded admin supervisor ID
      supervisor_id: "16bdea6d-7845-4c40-82f5-07a38103eba7", // Admin user ID from your system
      gps_location: {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
      },
      photo_base64: photoBase64,
    };
    
    console.log('Creating crate with supervisor_id:', crateData.supervisor_id);

    try {
      // Dispatch action to create crate
      await dispatch(createCrate(crateData)).unwrap();

      // Show success message and navigate back
      Alert.alert('Success', 'Crate recorded successfully', [
        { text: 'OK', onPress: () => navigation.navigate('CrateList') },
      ]);
    } catch (error) {
      // Error handling is done in the slice
      console.error('Error creating crate:', error);
      Alert.alert('Error', 'Failed to create crate. Please try again with a smaller photo or no photo.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Record Harvest Crate</Text>

        <Formik
          initialValues={{
            qr_code: qrCode || '',
            variety_id: '',
            weight: '',
            quality_grade: 'A',
            notes: '',
          }}
          validationSchema={CrateSchema}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => (
            <View>
              <TextInput
                label="QR Code"
                value={values.qr_code}
                onChangeText={handleChange('qr_code')}
                onBlur={handleBlur('qr_code')}
                errorText={touched.qr_code && errors.qr_code}
                disabled={!!qrCode}
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Variety</Text>
                <View style={styles.pickerWrapper}>
                  {loadingVarieties ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={styles.loadingText}>Loading varieties...</Text>
                    </View>
                  ) : (
                    <Picker
                      selectedValue={values.variety_id}
                      onValueChange={(itemValue) =>
                        setFieldValue('variety_id', itemValue)
                      }
                      style={styles.picker}
                      enabled={varieties.length > 0}
                    >
                      <Picker.Item label="Select variety..." value="" />
                      {varieties.length > 0 ? (
                        varieties.map((variety) => (
                          <Picker.Item
                            key={variety.id}
                            label={variety.name}
                            value={variety.id}
                          />
                        ))
                      ) : (
                        <Picker.Item label="No varieties available" value="" />
                      )}
                    </Picker>
                  )}
                </View>
                {touched.variety_id && errors.variety_id && (
                  <Text style={styles.errorText}>{errors.variety_id}</Text>
                )}
                {!loadingVarieties && varieties.length === 0 && (
                  <Text style={styles.warningText}>No varieties found. Please contact an administrator.</Text>
                )}
              </View>

              <TextInput
                label="Weight (kg)"
                value={values.weight}
                onChangeText={handleChange('weight')}
                onBlur={handleBlur('weight')}
                errorText={touched.weight && errors.weight}
                keyboardType="numeric"
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Quality Grade</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={values.quality_grade}
                    onValueChange={(itemValue) =>
                      setFieldValue('quality_grade', itemValue)
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="A - Premium" value="A" />
                    <Picker.Item label="B - Standard" value="B" />
                    <Picker.Item label="C - Processing" value="C" />
                    <Picker.Item label="Reject" value="reject" />
                  </Picker>
                </View>
              </View>

              <TextInput
                label="Notes (Optional)"
                value={values.notes}
                onChangeText={handleChange('notes')}
                onBlur={handleBlur('notes')}
                errorText={touched.notes && errors.notes}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>Location</Text>
                {location ? (
                  <View style={styles.locationStatus}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.locationText}>
                      {locationDisplay || `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.locationStatus}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={theme.colors.error}
                    />
                    <Text style={styles.locationError}>
                      Determining location...
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.photoSection}>
                <Text style={styles.photoLabel}>Photo</Text>

                <View style={styles.photoButtonsRow}>
                  <Button
                    mode="outlined"
                    onPress={takePhoto}
                    style={styles.photoButton}
                    icon={() => (
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                    )}
                  >
                    Take Photo
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={pickImage}
                    style={styles.photoButton}
                    icon={() => (
                      <Ionicons
                        name="image-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                    )}
                  >
                    Gallery
                  </Button>
                </View>

                {photo && (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoPreview}
                    />
                    <Button
                      mode="text"
                      onPress={() => setPhoto(null)}
                      style={styles.removePhotoButton}
                      icon={() => (
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={theme.colors.error}
                        />
                      )}
                    >
                      Remove
                    </Button>
                  </View>
                )}
              </View>

              {error && (
                <Text style={styles.submitError}>
                  {error.message || 'An error occurred while saving.'}
                </Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              >
                Record Crate
              </Button>
            </View>
          )}
        </Formik>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    marginVertical: 12,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.text,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.placeholder,
    borderRadius: 4,
    marginBottom: 4,
  },
  picker: {
    height: 50,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    paddingTop: 4,
  },
  locationContainer: {
    marginVertical: 12,
  },
  locationLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.text,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  locationError: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.error,
  },
  photoSection: {
    marginVertical: 12,
  },
  photoLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.text,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  photoPreviewContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  photoPreview: {
    width: 250,
    height: 250,
    borderRadius: 8,
  },
  removePhotoButton: {
    marginTop: 8,
  },
  submitError: {
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  warningText: {
    color: theme.colors.notification,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 14,
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});
