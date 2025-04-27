// src/navigation/index.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';

// Main app screens
import HomeScreen from '../screens/home/HomeScreen';
import CrateScanScreen from '../screens/crates/CrateScanScreen';
import CrateFormScreen from '../screens/crates/CrateFormScreen';
import BatchListScreen from '../screens/batches/BatchListScreen';
import BatchDetailScreen from '../screens/batches/BatchDetailScreen';
import ReconciliationScreen from '../screens/reconciliation/ReconciliationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

// Tab navigator for main app
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Crates') {
          iconName = focused ? 'cube' : 'cube-outline';
        } else if (route.name === 'Batches') {
          iconName = focused ? 'archive' : 'archive-outline';
        } else if (route.name === 'Reconcile') {
          iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Crates" component={CrateNavigator} />
    <Tab.Screen name="Batches" component={BatchNavigator} />
    <Tab.Screen name="Reconcile" component={ReconciliationNavigator} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Stack navigators for each feature
const CrateNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen name="CrateList" component={CrateListScreen} />
    <MainStack.Screen name="CrateScan" component={CrateScanScreen} />
    <MainStack.Screen name="CrateForm" component={CrateFormScreen} />
  </MainStack.Navigator>
);

const BatchNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen name="BatchList" component={BatchListScreen} />
    <MainStack.Screen name="BatchDetail" component={BatchDetailScreen} />
  </MainStack.Navigator>
);

const ReconciliationNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen
      name="ReconciliationMain"
      component={ReconciliationScreen}
    />
  </MainStack.Navigator>
);

// Root navigator
export default function AppNavigator() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
