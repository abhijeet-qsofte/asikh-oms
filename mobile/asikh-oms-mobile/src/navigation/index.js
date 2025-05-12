// src/navigation/index.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/LoginScreen';

// Main app screens
import HomeScreen from '../screens/home/HomeScreen';
import CrateScanScreen from '../screens/crates/CrateScanScreen';
import CrateFormScreen from '../screens/crates/CrateFormScreen';
import CrateListScreen from '../screens/crates/crateListScreen';
import CrateDetailsScreen from '../screens/crates/crateDetailScreen';
// Batch screens
import BatchFormScreen from '../screens/batches/BatchFormScreen';
import BatchDetailScreen from '../screens/batches/BatchDetailScreen';
import BatchScanScreen from '../screens/batches/BatchScanScreen';
import BatchListScreen from '../screens/batches/BatchListScreen';
//import ReconciliationScreen from '../screens/reconciliation/ReconciliationScreen';
//import ProfileScreen from '../screens/profile/ProfileScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import FarmManagementScreen from '../screens/admin/FarmManagementScreen';
import PackhouseManagementScreen from '../screens/admin/PackhouseManagementScreen';
import VarietyManagementScreen from '../screens/admin/VarietyManagementScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';

const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();
const AdminStack = createStackNavigator();
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
        } else if (route.name === 'Admin') {
          iconName = focused ? 'settings' : 'settings-outline';
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
    <Tab.Screen name="Admin" component={AdminNavigator} />
    {/* <Tab.Screen name="Profile" component={ProfileScreen} /> */}
  </Tab.Navigator>
);

// Stack navigators for each feature - Harvest Entry Flow
const CrateNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen name="CrateList" component={CrateListScreen} options={{ title: 'Crates' }} />
    <MainStack.Screen name="CrateScan" component={CrateScanScreen} options={{ title: 'Scan Crate QR' }} />
    <MainStack.Screen name="CrateForm" component={CrateFormScreen} options={{ title: 'Crate Details' }} />
    <MainStack.Screen name="CrateDetail" component={CrateDetailsScreen} options={{ title: 'Crate Summary' }} />
  </MainStack.Navigator>
);

// Dispatch Scan Flow
const BatchNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen name="BatchList" component={BatchListScreen} options={{ title: 'Batches' }} />
    <MainStack.Screen name="BatchScan" component={BatchScanScreen} options={{ title: 'Add Crates to Batch' }} />
    <MainStack.Screen name="BatchAssign" component={BatchFormScreen} options={{ title: 'Create Batch' }} />
    <MainStack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ title: 'Batch Details' }} />
  </MainStack.Navigator>
);

// Reconciliation Flow
const ReconciliationNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen name="ReconciliationList" component={CrateListScreen} options={{ title: 'Select Batch' }} />
    <MainStack.Screen name="ReconciliationScan" component={CrateScanScreen} options={{ title: 'Scan Crates' }} />
    <MainStack.Screen name="ReconciliationDetail" component={CrateDetailsScreen} options={{ title: 'Reconciliation Summary' }} />
  </MainStack.Navigator>
);

// Admin Flow
const AdminNavigator = () => (
  <AdminStack.Navigator>
    <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    <AdminStack.Screen name="FarmManagement" component={FarmManagementScreen} options={{ title: 'Manage Farms' }} />
    <AdminStack.Screen name="PackhouseManagement" component={PackhouseManagementScreen} options={{ title: 'Manage Packhouses' }} />
    <AdminStack.Screen name="VarietyManagement" component={VarietyManagementScreen} options={{ title: 'Manage Varieties' }} />
    <AdminStack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Manage Users' }} />
  </AdminStack.Navigator>
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
