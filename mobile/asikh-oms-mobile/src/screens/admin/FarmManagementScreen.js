// src/screens/admin/FarmManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Title, Button, FAB, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { theme } from '../../constants/theme';
import { getFarms, createFarm, updateFarm, resetAdminState } from '../../store/slices/adminSlice';

// Validation schema for farm form
const FarmSchema = Yup.object().shape({
  name: Yup.string().required('Farm name is required'),
  location: Yup.string().required('Location is required'),
  contact_person: Yup.string().required('Contact person is required'),
  contact_number: Yup.string().required('Contact number is required'),
});

export default function FarmManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { farms, loading, error, success } = useSelector((state) => state.admin);
  const { user } = useSelector((state) => state.auth);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  
  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      Alert.alert(
        'Access Denied',
        'You need administrator privileges to access this section.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      loadFarms();
    }
    
    // Reset state when component unmounts
    return () => {
      dispatch(resetAdminState());
    };
  }, [user, navigation]);
  
  // Handle success state
  useEffect(() => {
    if (success) {
      setModalVisible(false);
      dispatch(resetAdminState());
    }
  }, [success]);
  
  // Load farms from API
  const loadFarms = () => {
    dispatch(getFarms());
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(getFarms());
    setRefreshing(false);
  };
  
  // Handle form submission
  const handleSubmit = (values) => {
    if (isEditing && currentItem) {
      // Update existing farm
      dispatch(updateFarm({
        farmId: currentItem.id,
        farmData: values
      }));
    } else {
      // Create new farm
      dispatch(createFarm(values));
    }
  };
  
  // Handle edit button press
  const handleEdit = (item) => {
    setCurrentItem(item);
    setIsEditing(true);
    setModalVisible(true);
  };
  
  // Handle add button press
  const handleAdd = () => {
    setCurrentItem(null);
    setIsEditing(false);
    setModalVisible(true);
  };
  
  // If not admin, show access denied
  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color={theme.colors.error} />
        <Text style={styles.accessDeniedText}>
          Administrator access required
        </Text>
      </View>
    );
  }
  
  // Render each farm item
  const renderFarmItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>{item.name}</Title>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
            <Ionicons name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.location}</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.contact_person}</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.contact_number}</Text>
        </View>
      </Card.Content>
    </Card>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No Farms Found</Text>
      <Text style={styles.emptySubtext}>
        Add a new farm to get started
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.detail || error.message || 'An error occurred'}
          </Text>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading farms...</Text>
        </View>
      ) : (
        <FlatList
          data={farms}
          renderItem={renderFarmItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty()}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
      
      {/* Add Farm FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAdd}
        color="white"
      />
      
      {/* Add Farm Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Farm' : 'Add New Farm'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Formik
                initialValues={isEditing && currentItem ? {
                  name: currentItem.name,
                  location: currentItem.location,
                  contact_person: currentItem.contact_person,
                  contact_number: currentItem.contact_number,
                } : {
                  name: '',
                  location: '',
                  contact_person: '',
                  contact_number: '',
                }}
                validationSchema={FarmSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                }) => (
                  <View>
                    <TextInput
                      label="Farm Name"
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlur={handleBlur('name')}
                      error={touched.name && errors.name}
                      style={styles.input}
                    />
                    {touched.name && errors.name && (
                      <Text style={styles.errorText}>{errors.name}</Text>
                    )}
                    
                    <TextInput
                      label="Location"
                      value={values.location}
                      onChangeText={handleChange('location')}
                      onBlur={handleBlur('location')}
                      error={touched.location && errors.location}
                      style={styles.input}
                    />
                    {touched.location && errors.location && (
                      <Text style={styles.errorText}>{errors.location}</Text>
                    )}
                    
                    <TextInput
                      label="Contact Person"
                      value={values.contact_person}
                      onChangeText={handleChange('contact_person')}
                      onBlur={handleBlur('contact_person')}
                      error={touched.contact_person && errors.contact_person}
                      style={styles.input}
                    />
                    {touched.contact_person && errors.contact_person && (
                      <Text style={styles.errorText}>{errors.contact_person}</Text>
                    )}
                    
                    <TextInput
                      label="Contact Number"
                      value={values.contact_number}
                      onChangeText={handleChange('contact_number')}
                      onBlur={handleBlur('contact_number')}
                      error={touched.contact_number && errors.contact_number}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                    {touched.contact_number && errors.contact_number && (
                      <Text style={styles.errorText}>{errors.contact_number}</Text>
                    )}
                    
                    <View style={styles.buttonContainer}>
                      <Button
                        mode="outlined"
                        onPress={() => setModalVisible(false)}
                        style={styles.button}
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={handleSubmit}
                        style={styles.button}
                        loading={loading}
                        disabled={loading}
                      >
                        Save
                      </Button>
                    </View>
                  </View>
                )}
              </Formik>
            </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 5,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 4,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
});
