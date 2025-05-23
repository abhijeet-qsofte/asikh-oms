import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Share } from 'react-native';
import { createDeepLink } from '../utils/linking';

/**
 * A button component that creates and shares deep links to specific screens
 * 
 * @param {object} props Component props
 * @param {string} props.routeName The name of the route to link to
 * @param {object} props.params Parameters to include in the deep link
 * @param {string} props.title Button text
 * @param {function} props.onPress Optional additional function to call on press
 */
const DeepLinkButton = ({ 
  routeName, 
  params = {}, 
  title = 'Share Link', 
  onPress,
  style,
  textStyle
}) => {
  const handlePress = async () => {
    try {
      // Create the deep link URL
      const url = createDeepLink(routeName, params);
      
      // Share the deep link
      await Share.share({
        message: `Check out this ${routeName} in the Asikh OMS app: ${url}`,
        url: url
      });
      
      // Call the additional onPress handler if provided
      if (onPress) {
        onPress();
      }
    } catch (error) {
      console.error('Error sharing deep link:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress}
    >
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DeepLinkButton;
