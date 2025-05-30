// src/screens/admin/VarietyManagementScreen.js
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
import { getVarieties, createVariety, updateVariety, resetAdminState } from '../../store/slices/adminSlice';

// Validation schema for variety form
const VarietySchema = Yup.object().shape({
  name: Yup.string().required('Variety name is required'),
  description: Yup.string().required('Description is required'),
  average_weight: Yup.number().required('Average weight is required').positive('Weight must be positive'),
  season_start: Yup.string().required('Season start is required'),
  season_end: Yup.string().required('Season end is required'),
});

export default function VarietyManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { varieties, loading, error, success } = useSelector((state) => state.admin);
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
      loadVarieties();
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
  
  // Load varieties from API
  const loadVarieties = () => {
    dispatch(getVarieties());
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(getVarieties());
    setRefreshing(false);
  };
  
  // Handle form submission
  const handleSubmit = (values) => {
    // Convert average_weight to number
    const varietyData = {
      ...values,
      average_weight: Number(values.average_weight),
    };
    
    if (isEditing && currentItem) {
      // Update existing variety
      dispatch(updateVariety({
        varietyId: currentItem.id,
        varietyData
      }));
    } else {
      // Create new variety
      dispatch(createVariety(varietyData));
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
  
  // Render each variety item
  const renderVarietyItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>{item.name}</Title>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
            <Ionicons name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.description}</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="scale-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>Avg. Weight: {item.average_weight} kg</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>Season: {item.season_start} - {item.season_end}</Text>
        </View>
      </Card.Content>
    </Card>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="nutrition-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No Varieties Found</Text>
      <Text style={styles.emptySubtext}>
        Add a new mango variety to get started
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
          <Text style={styles.loadingText}>Loading varieties...</Text>
        </View>
      ) : (
        <FlatList
          data={varieties}
          renderItem={renderVarietyItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty()}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
      
      {/* Add Variety FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAdd}
        color="#fff"
      />
      
      {/* Add Variety Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Mango Variety' : 'Add New Mango Variety'}
              </Text>
              
              <Formik
                initialValues={{
                  name: isEditing && currentItem ? currentItem.name : '',
                  description: isEditing && currentItem ? currentItem.description : '',
                  average_weight: isEditing && currentItem ? String(currentItem.average_weight) : '',
                  season_start: isEditing && currentItem ? currentItem.season_start : '',
                  season_end: isEditing && currentItem ? currentItem.season_end : '',
                }}
                enableReinitialize={true}
                validationSchema={VarietySchema}
                onSubmit={handleSubmit}
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
                      label="Variety Name"
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
                      label="Description"
                      value={values.description}
                      onChangeText={handleChange('description')}
                      onBlur={handleBlur('description')}
                      error={touched.description && errors.description}
                      multiline
                      numberOfLines={3}
                      style={styles.input}
                    />
                    {touched.description && errors.description && (
                      <Text style={styles.errorText}>{errors.description}</Text>
                    )}
                    
                    <TextInput
                      label="Average Weight (kg)"
                      value={values.average_weight}
                      onChangeText={handleChange('average_weight')}
                      onBlur={handleBlur('average_weight')}
                      error={touched.average_weight && errors.average_weight}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    {touched.average_weight && errors.average_weight && (
                      <Text style={styles.errorText}>{errors.average_weight}</Text>
                    )}
                    
                    <TextInput
                      label="Season Start (Month)"
                      value={values.season_start}
                      onChangeText={handleChange('season_start')}
                      onBlur={handleBlur('season_start')}
                      error={touched.season_start && errors.season_start}
                      style={styles.input}
                      placeholder="e.g., January"
                    />
                    {touched.season_start && errors.season_start && (
                      <Text style={styles.errorText}>{errors.season_start}</Text>
                    )}
                    
                    <TextInput
                      label="Season End (Month)"
                      value={values.season_end}
                      onChangeText={handleChange('season_end')}
                      onBlur={handleBlur('season_end')}
                      error={touched.season_end && errors.season_end}
                      style={styles.input}
                      placeholder="e.g., April"
                    />
                    {touched.season_end && errors.season_end && (
                      <Text style={styles.errorText}>{errors.season_end}</Text>
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
                        {isEditing ? 'Update Variety' : 'Add Variety'}
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editButton: {
    padding: 8,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
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
