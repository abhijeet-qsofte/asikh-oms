// src/components/QRCodeInputModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import Button from './Button';

const QRCodeInputModal = ({ visible, onClose, onSubmit, title, description }) => {
  const [qrCode, setQrCode] = useState('CR-');
  const [error, setError] = useState('');
  
  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setQrCode('CR-');
      setError('');
    }
  }, [visible]);
  
  // Validate QR code format (CR-MMDDYY-XXX)
  const validateQRCode = () => {
    const qrPattern = /^CR-\d{6}-\d{3}$/i;
    
    if (!qrCode) {
      setError('QR code is required');
      return false;
    }
    
    if (!qrPattern.test(qrCode)) {
      setError('Invalid QR code format. Expected format: CR-MMDDYY-XXX');
      return false;
    }
    
    setError('');
    return true;
  };
  
  // Handle submit button press
  const handleSubmit = () => {
    if (validateQRCode()) {
      onSubmit(qrCode);
      onClose();
    }
  };
  
  // Generate a valid QR code
  const generateQRCode = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    
    const generatedQrCode = `CR-${month}${day}${year}-${randomNum}`;
    setQrCode(generatedQrCode);
    setError('');
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>{title || 'Enter QR Code'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.description}>
            {description || 'Please enter the crate QR code in the format CR-MMDDYY-XXX'}
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={qrCode}
              onChangeText={setQrCode}
              placeholder="CR-MMDDYY-XXX"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus={true}
            />
            
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateQRCode}
            >
              <Ionicons name="refresh" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
            >
              Cancel
            </Button>
            
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
            >
              Submit
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  closeButton: {
    padding: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  generateButton: {
    padding: 10,
    marginLeft: 10,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    borderColor: '#ccc',
  },
});

export default QRCodeInputModal;
