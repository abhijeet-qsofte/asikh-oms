// src/screens/auth/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { login, clearError } from '../store/slices/authSlice';
import { getDeviceInfo } from '../utils/deviceInfo';
import { theme } from '../constants/theme';
import apiClient from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY } from '../constants/config';

const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

export default function LoginScreen() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [deviceInfo, setDeviceInfo] = useState(null);

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
      .then(res => console.log('API OK:', res.data))
      .catch(err => console.error('API ❌', err.message));
  }, []);

  const handleLogin = async (values) => {
    try {
      console.log('Attempting login for user:', values.username);
      
      // Clear any existing tokens before login to prevent token conflicts
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
      console.log('Cleared existing authentication tokens');
      
      // unwrap to throw on error and capture stack
      await dispatch(
        login({
          username: values.username,
          password: values.password,
          deviceInfo,
        })
      ).unwrap();
      
      console.log('Login successful');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Mango Harvester</Text>
        <Text style={styles.subtitle}>Login to continue</Text>
      </View>

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
          </View>
        )}
      </Formik>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Asikh Order Management System</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </View>
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
});
