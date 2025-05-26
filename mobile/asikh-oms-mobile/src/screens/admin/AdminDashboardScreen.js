// src/screens/admin/AdminDashboardScreen.js
import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useSelector((state) => state.auth);
  
  // State to track if authentication is bypassed
  const [bypassAuth, setBypassAuth] = React.useState(false);
  
  // Check if authentication is required and if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Import config to check if authentication is required
        const { REQUIRE_AUTHENTICATION } = await import('../../constants/config');
        setBypassAuth(!REQUIRE_AUTHENTICATION);
        
        // If authentication is required, check if user is admin
        if (REQUIRE_AUTHENTICATION && user && user.role !== 'admin') {
          Alert.alert(
            'Access Denied',
            'You need administrator privileges to access this section.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (err) {
        console.error('Error checking authentication requirement:', err);
      }
    };
    
    checkAdminAccess();
  }, [user, navigation]);
  
  // If authentication is required and user is not admin, show access denied
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
  
  // Admin dashboard menu items
  const menuItems = [
    {
      id: 'farms',
      title: 'Manage Farms',
      icon: 'leaf',
      description: 'Add, edit, or remove farm locations',
      screen: 'FarmManagement',
    },
    {
      id: 'packhouses',
      title: 'Manage Packhouses',
      icon: 'business',
      description: 'Add, edit, or remove packhouse locations',
      screen: 'PackhouseManagement',
    },
    {
      id: 'varieties',
      title: 'Manage Varieties',
      icon: 'nutrition',
      description: 'Add, edit, or remove mango varieties',
      screen: 'VarietyManagement',
    },
    {
      id: 'users',
      title: 'Manage Users',
      icon: 'people',
      description: 'Add, edit, or remove system users',
      screen: 'UserManagement',
    },
  ];
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Manage system settings and master data
        </Text>
      </View>
      
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={item.icon}
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.placeholder}
                />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  menuContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.placeholder,
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
