// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { login, clearError, loginWithPin } from '../store/slices/authSlice';
import { getDeviceInfo } from '../utils/deviceInfo';
import { theme } from '../constants/theme';
import apiClient from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  API_BASE_URL, 
  AUTH_CREDENTIALS_KEY, 
  USER_INFO_KEY, 
  USE_PIN_AUTH, 
  PIN_LENGTH,
  DEFAULT_PIN,
  REQUIRE_AUTHENTICATION
} from '../constants/config';

const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

const PinSchema = Yup.object().shape({
  pin: Yup.string()
    .required('PIN is required')
    .length(PIN_LENGTH, `PIN must be exactly ${PIN_LENGTH} digits`)
    .matches(/^\d+$/, 'PIN must contain only digits'),
});

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [showPinLogin, setShowPinLogin] = useState(USE_PIN_AUTH);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };

    fetchDeviceInfo();

    return () => {
      // Clear any errors when unmounting
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => console.log('API OK:', res.data))
      .catch((err) => console.error('API ❌', err.message));
      
    // If authentication is not required, auto-login as admin
    if (!REQUIRE_AUTHENTICATION) {
      console.log('Authentication bypassed - auto-login as admin');
      // Store admin user info in AsyncStorage
      const adminUser = {
        username: 'admin',
        role: 'admin',
        user_id: '00000000-0000-0000-0000-000000000000',
        access_token: 'dummy-token',
        token_type: 'bearer'
      };
      AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(adminUser));
      
      // Instead of using navigation.reset, we'll update the Redux store
      // This will trigger the AppNavigator to show the TabNavigator
      dispatch({ 
        type: 'auth/loginSuccess', 
        payload: { 
          user: adminUser,
          token: 'dummy-token'
        }
      });
    }
  }, [navigation]);

  const handleLogin = async (values) => {
    try {
      console.log('Attempting login for user:', values.username);

      // Clear any existing auth data before login
      if (AUTH_CREDENTIALS_KEY) await AsyncStorage.removeItem(AUTH_CREDENTIALS_KEY);
      if (USER_INFO_KEY) await AsyncStorage.removeItem(USER_INFO_KEY);
      console.log('Cleared existing authentication data');

      // Dispatch login action with username and password
      await dispatch(
        login({
          username: values.username,
          password: values.password,
        })
      ).unwrap();

      console.log('Login successful');
    } catch (err) {
      console.error('Login error:', err);
    }
  };
  
  const handlePinLogin = async (values) => {
    try {
      console.log('Attempting PIN login');
      
      // Clear any existing auth data before login
      if (AUTH_CREDENTIALS_KEY) await AsyncStorage.removeItem(AUTH_CREDENTIALS_KEY);
      if (USER_INFO_KEY) await AsyncStorage.removeItem(USER_INFO_KEY);
      console.log('Cleared existing authentication data');
      
      // Dispatch PIN login action
      await dispatch(
        loginWithPin({
          pin: values.pin,
        })
      ).unwrap();
      
      console.log('PIN login successful');
    } catch (err) {
      console.error('PIN login error:', err);
    }
  };
  
  const toggleLoginMethod = () => {
    setShowPinLogin(!showPinLogin);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Mango Harvester</Text>
        <Text style={styles.subtitle}>
          {showPinLogin ? 'Enter PIN to continue' : 'Login to continue'}
        </Text>
      </View>

      {showPinLogin ? (
        <Formik
          initialValues={{ pin: '' }}
          validationSchema={PinSchema}
          onSubmit={handlePinLogin}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View style={styles.form}>
              <TextInput
                label="PIN"
                value={values.pin}
                onChangeText={handleChange('pin')}
                onBlur={handleBlur('pin')}
                error={touched.pin && errors.pin}
                errorText={touched.pin && errors.pin}
                keyboardType="numeric"
                maxLength={PIN_LENGTH}
                secureTextEntry
              />

              {error && (
                <Text style={styles.errorText}>
                  {error.message || 'Authentication failed'}
                </Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
              >
                Login with PIN
              </Button>
              
              {/* Only show toggle button if we're not in production-only mode */}
              {!USE_PIN_AUTH && (
                <TouchableOpacity 
                  onPress={toggleLoginMethod}
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleText}>Use Username & Password</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Formik>
      ) : (
        <Formik
          initialValues={{ username: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleLogin}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View style={styles.form}>
              <TextInput
                label="Username"
                value={values.username}
                onChangeText={handleChange('username')}
                onBlur={handleBlur('username')}
                error={touched.username && errors.username}
                errorText={touched.username && errors.username}
                autoCapitalize="none"
              />

              <TextInput
                label="Password"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                error={touched.password && errors.password}
                errorText={touched.password && errors.password}
                secureTextEntry
              />

              {error && (
                <Text style={styles.errorText}>
                  {error.message || 'Authentication failed'}
                </Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
              >
                Login
              </Button>
              
              <TouchableOpacity 
                onPress={toggleLoginMethod}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>Use PIN</Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Asikh Order Management System</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
        
        <TouchableOpacity 
          onPress={() => navigation && navigation.navigate('AdminPinSetup')}
          style={styles.adminButton}
        >
          <Text style={styles.adminButtonText}>Initialize Admin PIN</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.secondary,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 10,
  },
  footer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.secondary,
    marginBottom: 5,
  },
  version: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  adminButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  adminButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  toggleButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  toggleText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
