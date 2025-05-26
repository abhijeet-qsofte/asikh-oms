// src/screens/AdminPinSetupScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { theme } from '../constants/theme';
import { initAdminWithDefaultPin, checkPinDataExists } from '../utils/initAdminPin';
import { DEFAULT_PIN } from '../constants/config';

export default function AdminPinSetupScreen({ navigation }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinExists, setPinExists] = useState(false);

  useEffect(() => {
    // Check if PIN data already exists
    const checkPin = async () => {
      const exists = await checkPinDataExists();
      setPinExists(exists);
    };
    
    checkPin();
  }, []);

  const handleInitAdmin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const success = await initAdminWithDefaultPin(username, password);
      
      if (success) {
        Alert.alert(
          'Success', 
          `Admin user initialized with default PIN: ${DEFAULT_PIN}`,
          [
            { 
              text: 'Go to Login', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
        setPinExists(true);
      } else {
        Alert.alert('Error', 'Failed to initialize admin user');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin PIN Setup</Text>
        <Text style={styles.subtitle}>
          Initialize admin user with default PIN: {DEFAULT_PIN}
        </Text>
      </View>

      <View style={styles.form}>
        {pinExists ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              PIN data already exists. You can use PIN authentication.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login')}
              style={styles.button}
            >
              Go to Login
            </Button>
          </View>
        ) : (
          <>
            <TextInput
              label="Admin Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <TextInput
              label="Admin Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              mode="contained"
              onPress={handleInitAdmin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Initialize Admin with PIN
            </Button>
          </>
        )}
        
        <Text style={styles.note}>
          This utility screen allows you to initialize the admin user with the default PIN
          without requiring an initial login with username and password.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: 20,
  },
  note: {
    marginTop: 30,
    fontSize: 14,
    color: theme.colors.placeholder,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    color: theme.colors.success,
    textAlign: 'center',
    marginBottom: 20,
  },
});
