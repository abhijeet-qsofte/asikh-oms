// src/screens/admin/UserManagementScreen.js
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
import { Card, Title, Button, FAB, TextInput, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { theme } from '../../constants/theme';
import { getUsers, createUser, resetAdminState } from '../../store/slices/adminSlice';
import { Picker } from '@react-native-picker/picker';

// Validation schema for user form
const UserSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username must be less than 100 characters')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[0-9]/, 'Password must contain at least one digit')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .required('Password is required'),
  full_name: Yup.string()
    .max(100, 'Full name must be less than 100 characters')
    .required('Full name is required'),
  role: Yup.string()
    .required('Role is required'),
  phone_number: Yup.string()
    .matches(/^\+?[0-9]{10,15}$/, 'Phone number must be 10-15 digits with optional + prefix')
    .required('Phone number is required'),
});

export default function UserManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { users, loading, error, success } = useSelector((state) => state.admin);
  const { user } = useSelector((state) => state.auth);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  
  // Role options
  const roleList = [
    { label: 'Admin', value: 'admin' },
    { label: 'Harvester', value: 'harvester' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Packhouse', value: 'packhouse' },
    { label: 'Manager', value: 'manager' },
  ];
  
  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Import config to check if authentication is required
        const { REQUIRE_AUTHENTICATION } = await import('../../constants/config');
        
        // If authentication is not required, allow access regardless of role
        if (!REQUIRE_AUTHENTICATION) {
          console.log('Authentication bypassed - allowing admin access');
          loadUsers();
          return;
        }
        
        // Otherwise check if user is admin
        if (user && user.role !== 'admin') {
          Alert.alert(
            'Access Denied',
            'You need administrator privileges to access this section.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          loadUsers();
        }
      } catch (err) {
        console.error('Error checking authentication requirement:', err);
        loadUsers(); // Try to load users anyway
      }
    };
    
    checkAdminAccess();
    
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
  
  // Load users from API
  const loadUsers = () => {
    dispatch(getUsers());
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(getUsers());
    setRefreshing(false);
  };
  
  // Handle form submission
  const handleSubmit = (values) => {
    dispatch(createUser(values));
  };
  
  // Get role color based on role
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#f44336'; // Red
      case 'harvester':
        return '#4caf50'; // Green
      case 'supervisor':
        return '#9c27b0'; // Purple
      case 'packhouse':
        return '#ff9800'; // Orange
      case 'manager':
        return '#2196f3'; // Blue
      default:
        return '#9e9e9e'; // Grey
    }
  };
  
  // Check if authentication is bypassed
  const [bypassAuth, setBypassAuth] = useState(false);
  
  // Check if authentication is required
  useEffect(() => {
    const checkAuthRequirement = async () => {
      try {
        const { REQUIRE_AUTHENTICATION } = await import('../../constants/config');
        setBypassAuth(!REQUIRE_AUTHENTICATION);
      } catch (err) {
        console.error('Error checking authentication requirement:', err);
      }
    };
    
    checkAuthRequirement();
  }, []);
  
  // If not admin and authentication is required, show access denied
  if (!bypassAuth && (!user || user.role !== 'admin')) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color={theme.colors.error} />
        <Text style={styles.accessDeniedText}>
          Administrator access required
        </Text>
      </View>
    );
  }
  
  // Render each user item
  const renderUserItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>{item.full_name}</Title>
          <Chip
            mode="outlined"
            textStyle={{ color: getRoleColor(item.role) }}
            style={[styles.roleChip, { borderColor: getRoleColor(item.role) }]}
          >
            {item.role}
          </Chip>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.username}</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.email}</Text>
        </View>
        
        <View style={styles.cardRow}>
          <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.cardText}>{item.phone_number}</Text>
        </View>
      </Card.Content>
    </Card>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={theme.colors.placeholder} />
      <Text style={styles.emptyText}>No Users Found</Text>
      <Text style={styles.emptySubtext}>
        Add a new user to get started
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
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty()}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
      
      {/* Add User FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setModalVisible(true)}
        color="#fff"
      />
      
      {/* Add User Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Add New User</Text>
              
              <Formik
                initialValues={{
                  username: '',
                  email: '',
                  password: '',
                  full_name: '',
                  role: '',
                  phone_number: '',
                }}
                validationSchema={UserSchema}
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
                  <View>
                    <TextInput
                      label="Full Name"
                      value={values.full_name}
                      onChangeText={handleChange('full_name')}
                      onBlur={handleBlur('full_name')}
                      error={touched.full_name && errors.full_name}
                      style={styles.input}
                      placeholder="Enter full name (max 100 characters)"
                    />
                    {touched.full_name && errors.full_name && (
                      <Text style={styles.errorText}>{errors.full_name}</Text>
                    )}
                    
                    <TextInput
                      label="Username"
                      value={values.username}
                      onChangeText={handleChange('username')}
                      onBlur={handleBlur('username')}
                      error={touched.username && errors.username}
                      style={styles.input}
                      placeholder="Enter username (3-100 characters)"
                    />
                    {touched.username && errors.username && (
                      <Text style={styles.errorText}>{errors.username}</Text>
                    )}
                    
                    <TextInput
                      label="Email"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      error={touched.email && errors.email}
                      keyboardType="email-address"
                      style={styles.input}
                      placeholder="Enter valid email address"
                    />
                    {touched.email && errors.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}
                    
                    <TextInput
                      label="Password"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      error={touched.password && errors.password}
                      secureTextEntry
                      style={styles.input}
                      placeholder="Min 8 chars, 1 digit, 1 uppercase letter"
                    />
                    {touched.password && errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                    {!touched.password && (
                      <Text style={styles.helperText}>Password must contain at least 8 characters, 1 digit, and 1 uppercase letter</Text>
                    )}
                    
                    <Text style={styles.label}>Role</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={values.role}
                        onValueChange={(itemValue) => setFieldValue('role', itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select Role" value="" />
                        {roleList.map((role) => (
                          <Picker.Item key={role.value} label={role.label} value={role.value} />
                        ))}
                      </Picker>
                    </View>
                    {touched.role && errors.role && (
                      <Text style={styles.errorText}>{errors.role}</Text>
                    )}
                    
                    <TextInput
                      label="Phone Number"
                      value={values.phone_number}
                      onChangeText={handleChange('phone_number')}
                      onBlur={handleBlur('phone_number')}
                      error={touched.phone_number && errors.phone_number}
                      keyboardType="phone-pad"
                      style={styles.input}
                      placeholder="Enter 10-15 digits with optional + prefix"
                    />
                    {touched.phone_number && errors.phone_number && (
                      <Text style={styles.errorText}>{errors.phone_number}</Text>
                    )}
                    {!touched.phone_number && (
                      <Text style={styles.helperText}>Phone number must be 10-15 digits with an optional + prefix</Text>
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
  roleChip: {
    height: 28,
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
    marginBottom: 8,
  },
  helperText: {
    color: theme.colors.placeholder,
    fontSize: 12,
    marginBottom: 8,
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
  label: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.placeholder,
    borderRadius: 4,
    marginBottom: 8,
  },
  picker: {
    height: 50,
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
