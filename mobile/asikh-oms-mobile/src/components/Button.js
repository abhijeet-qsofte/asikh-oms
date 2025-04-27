// src/components/Button.js
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { theme } from '../constants/theme';

const Button = ({ mode, style, children, ...props }) => (
  <PaperButton
    mode={mode || 'contained'}
    style={[styles.button, style]}
    labelStyle={styles.text}
    {...props}
  >
    {children}
  </PaperButton>
);

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginVertical: 10,
    paddingVertical: 2,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 15,
    lineHeight: 26,
  },
});

export default Button;
