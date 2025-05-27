// src/screens/batches/BatchFormScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Picker } from '@react-native-picker/picker';
import { format, addHours } from 'date-fns';
import TextInput from '../../components/TextInput';
import Button from '../../components/Button';
import { theme } from '../../constants/theme';
import { createBatch } from '../../store/slices/batchSlice';
import { getFarms, getPackhouses, getUsers } from '../../store/slices/adminSlice';
import { Ionicons } from '@expo/vector-icons';
import { Button as PaperButton } from 'react-native-paper';

// Form validation schema
const BatchSchema = Yup.object().shape({
  transport_mode: Yup.string().required('Transport mode is required'),
  from_location: Yup.string().required('Origin location is required'),
  to_location: Yup.string().required('Destination location is required'),
  vehicle_number: Yup.string(),
  driver_name: Yup.string(),
  notes: Yup.string(),
});

export default function BatchFormScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.batches);
  const { farms = [], packhouses = [], users = [], loading: adminLoading } = useSelector((state) => state.admin);
  const currentUser = useSelector((state) => state.auth.user);
  
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [eta, setEta] = useState(addHours(new Date(), 2)); // Default ETA is 2 hours from now
  
  // Transport modes
  const transportModes = ['truck', 'van', 'bicycle', 'motorbike', 'other'];
  
  // Fetch farms and packhouses on component mount
  useEffect(() => {
    console.log('Fetching farms and packhouses...');
    dispatch(getFarms());
    dispatch(getPackhouses());
    // We'll use a hardcoded supervisor ID instead of fetching users
  }, [dispatch]);
  
  // Debug admin state
  useEffect(() => {
    console.log('Admin state updated:', { farms, packhouses, adminLoading });
  }, [farms, packhouses, adminLoading]);

  // Navigate to scan screen after successful batch creation
  useEffect(() => {
    if (success) {
      navigation.navigate('BatchScan');
    }
  }, [success, navigation]);
  
  // Handle form submission
  const handleSubmit = (values) => {
    console.log('Current User:', currentUser);
    console.log('Form Values:', values);
    console.log('Available Farms:', farms);
    console.log('Available Packhouses:', packhouses);
    
    if (!currentUser) {
      Alert.alert('Error', 'User information not available. Please log in again.');
      return;
    }
    
    // Validate that the selected farm and packhouse exist
    const selectedFarm = farms.find(farm => farm.id === values.from_location);
    const selectedPackhouse = packhouses.find(packhouse => packhouse.id === values.to_location);
    
    if (!selectedFarm) {
      Alert.alert('Error', `Farm with ID ${values.from_location} not found. Please select a valid farm.`);
      return;
    }
    
    if (!selectedPackhouse) {
      Alert.alert('Error', `Packhouse with ID ${values.to_location} not found. Please select a valid packhouse.`);
      return;
    }
    
    // We'll let the batchSlice handle the supervisor ID
    // This way we can try multiple IDs if needed
    console.log('Letting batchSlice handle supervisor ID');
    
    // Ensure all UUIDs are properly formatted
    const batchData = {
      transport_mode: values.transport_mode,
      from_location: values.from_location,
      to_location: values.to_location,
      // supervisor_id will be handled by the batchSlice
      vehicle_number: values.vehicle_number || null,
      driver_name: values.driver_name || null,
      eta: values.eta ? new Date(values.eta).toISOString() : null,
      notes: values.notes || null,
      status: 'CREATED', // Add status field which is likely required by the backend
      total_weight: 0 // Add total_weight field with default value of 0
    };
    
    console.log('Batch Data being sent:', batchData);
    dispatch(createBatch(batchData));
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create New Batch</Text>
        <Text style={styles.subtitle}>
          Create a batch to group crates for dispatch to packhouse
        </Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.detail || error.message || 'An error occurred'}
          </Text>
        </View>
      )}
      
      {adminLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading farm and packhouse data...</Text>
        </View>
      ) : (
      <Formik
        initialValues={{
          transport_mode: 'truck',
          from_location: farms.length > 0 ? farms[0].id : '',
          to_location: packhouses.length > 0 ? packhouses[0].id : '',
          vehicle_number: '',
          driver_name: '',
          eta: eta.toISOString(),
          notes: '',
        }}
        validationSchema={BatchSchema}
        onSubmit={handleSubmit}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          setFieldValue,
        }) => (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Transport Details</Text>
            
            <Text style={styles.label}>Transport Mode</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={values.transport_mode}
                onValueChange={(itemValue) => setFieldValue('transport_mode', itemValue)}
                style={styles.picker}
              >
                {transportModes.map((mode) => (
                  <Picker.Item
                    key={mode}
                    label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                    value={mode}
                  />
                ))}
              </Picker>
            </View>
            {errors.transport_mode && touched.transport_mode && (
              <Text style={styles.errorText}>{errors.transport_mode}</Text>
            )}
            
            <TextInput
              label="Vehicle Number (Optional)"
              value={values.vehicle_number}
              onChangeText={handleChange('vehicle_number')}
              onBlur={handleBlur('vehicle_number')}
              error={touched.vehicle_number && errors.vehicle_number}
              errorText={touched.vehicle_number && errors.vehicle_number}
              autoCapitalize="characters"
              style={styles.input}
            />
            
            <TextInput
              label="Driver Name (Optional)"
              value={values.driver_name}
              onChangeText={handleChange('driver_name')}
              onBlur={handleBlur('driver_name')}
              error={touched.driver_name && errors.driver_name}
              errorText={touched.driver_name && errors.driver_name}
              style={styles.input}
            />
            
            <Text style={styles.label}>Estimated Time of Arrival (ETA)</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEtaModal(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.dateText}>
                {format(new Date(values.eta), 'MMM d, yyyy h:mm a')}
              </Text>
            </TouchableOpacity>
            
            <Modal
              visible={showEtaModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowEtaModal(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select ETA</Text>
                  
                  <View style={styles.timeOptions}>
                    {[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => {
                      const date = addHours(new Date(), hours);
                      return (
                        <TouchableOpacity
                          key={hours}
                          style={styles.timeOption}
                          onPress={() => {
                            setEta(date);
                            setFieldValue('eta', date.toISOString());
                            setShowEtaModal(false);
                          }}
                        >
                          <Text style={styles.timeOptionText}>
                            {hours} {hours === 1 ? 'hour' : 'hours'} - {format(date, 'h:mm a')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <View style={styles.modalActions}>
                    <PaperButton
                      mode="outlined"
                      onPress={() => setShowEtaModal(false)}
                      style={styles.modalButton}
                    >
                      Cancel
                    </PaperButton>
                  </View>
                </View>
              </View>
            </Modal>
            
            <Text style={styles.sectionTitle}>Locations</Text>
            
            <Text style={styles.label}>Origin (Farm)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={values.from_location}
                onValueChange={(itemValue) => setFieldValue('from_location', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Farm" value="" />
                {farms.map((farm) => (
                  <Picker.Item key={farm.id} label={farm.name} value={farm.id} />
                ))}
              </Picker>
            </View>
            {errors.from_location && touched.from_location && (
              <Text style={styles.errorText}>{errors.from_location}</Text>
            )}
            
            <Text style={styles.label}>Destination (Packhouse)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={values.to_location}
                onValueChange={(itemValue) => setFieldValue('to_location', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Packhouse" value="" />
                {packhouses.map((packhouse) => (
                  <Picker.Item
                    key={packhouse.id}
                    label={packhouse.name}
                    value={packhouse.id}
                  />
                ))}
              </Picker>
            </View>
            {errors.to_location && touched.to_location && (
              <Text style={styles.errorText}>{errors.to_location}</Text>
            )}
            
            <TextInput
              label="Notes (Optional)"
              value={values.notes}
              onChangeText={handleChange('notes')}
              onBlur={handleBlur('notes')}
              error={touched.notes && errors.notes}
              errorText={touched.notes && errors.notes}
              multiline
              numberOfLines={4}
              style={styles.input}
            />
            
            <Button
              mode="contained"
              onPress={() => {
                console.log('Submit button pressed');
                console.log('Form values:', values);
                handleSubmit(values);
              }}
              style={styles.submitButton}
              loading={loading}
              disabled={loading}
            >
              Create Batch
            </Button>
          </View>
        )}
      </Formik>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: theme.colors.text,
  },
  input: {
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.placeholder,
    borderRadius: 4,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.placeholder,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 40,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeOptions: {
    marginBottom: 16,
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionText: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 8,
  },
});
