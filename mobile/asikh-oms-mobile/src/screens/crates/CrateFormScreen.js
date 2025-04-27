// src/screens/crates/CrateFormScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image, Text } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';

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
  const [photo, setPhoto] = useState(null);
  const [varieties, setVarieties] = useState([
    { id: '91c7f473-6be5-4e49-a547-29e4ee53e0ef', name: 'Alphonso' },
    { id: 'a23fe3c5-4db5-4b9a-b3c5-7f361d6e1f2a', name: 'Langra' },
    { id: 'b85dfcc1-776f-4908-9db8-8f20dd49a56e', name: 'Kesar' },
    // In a real app, these would be fetched from the API
  ]);

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
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
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
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
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

    // Prepare crate data for API
    const crateData = {
      qr_code: values.qr_code,
      variety_id: values.variety_id,
      weight: parseFloat(values.weight),
      quality_grade: values.quality_grade,
      notes: values.notes,
      supervisor_id: currentUser.id,
      gps_location: {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
      },
      photo_base64: photo
        ? `data:image/jpeg;base64,${photo.base64}`
        : undefined,
    };

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
                  <Picker
                    selectedValue={values.variety_id}
                    onValueChange={(itemValue) =>
                      setFieldValue('variety_id', itemValue)
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select variety..." value="" />
                    {varieties.map((variety) => (
                      <Picker.Item
                        key={variety.id}
                        label={variety.name}
                        value={variety.id}
                      />
                    ))}
                  </Picker>
                </View>
                {touched.variety_id && errors.variety_id && (
                  <Text style={styles.errorText}>{errors.variety_id}</Text>
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
                      Lat: {location.latitude.toFixed(6)}, Lng:{' '}
                      {location.longitude.toFixed(6)}
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
  submitButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});
