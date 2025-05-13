import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Button, 
  Card, 
  Title, 
  Paragraph, 
  Avatar, 
  Divider, 
  Surface,
  Badge
} from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';
import { theme } from '../../constants/theme';

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    batches: { total: 24, pending: 5 },
    crates: { total: 156, available: 120 },
    reconciliation: { pending: 3 }
  });
  
  // Format greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Format date for display
  const formatDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return currentTime.toLocaleDateString(undefined, options);
  };
  
  // Quick action buttons based on user role
  const getQuickActions = () => {
    const actions = [
      { 
        id: 'scan', 
        title: 'Scan QR', 
        icon: 'qr-code-outline',
        color: '#4CAF50',
        onPress: () => navigation.navigate('CrateScan')
      }
    ];
    
    // Add role-specific actions
    if (user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'manager') {
      actions.push({ 
        id: 'createBatch', 
        title: 'New Batch', 
        icon: 'add-circle-outline',
        color: '#2196F3',
        onPress: () => navigation.navigate('BatchForm')
      });
    }
    
    if (user?.role === 'packhouse' || user?.role === 'supervisor' || user?.role === 'manager') {
      actions.push({ 
        id: 'receiveBatch', 
        title: 'Receive Batch', 
        icon: 'archive-outline',
        color: '#FF9800',
        onPress: () => navigation.navigate('BatchReceive')
      });
    }
    
    if (user?.role === 'admin') {
      actions.push({ 
        id: 'admin', 
        title: 'Admin Panel', 
        icon: 'settings-outline',
        color: '#9C27B0',
        onPress: () => navigation.navigate('Admin', { screen: 'AdminDashboard' })
      });
    }
    
    return actions;
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => dispatch(logout()),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate fetching data
    setTimeout(() => {
      setCurrentTime(new Date());
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.container}>
        {/* Header with background */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.welcomeText}>{user?.username || 'User'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              {getQuickActions().map((action) => (
                <TouchableOpacity 
                  key={action.id} 
                  style={styles.actionButton}
                  onPress={action.onPress}
                >
                  <Surface style={[styles.actionIcon, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon} size={28} color="white" />
                  </Surface>
                  <Text style={styles.actionText}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsCards}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Ionicons name="archive" size={24} color={theme.colors.primary} />
                    <Title style={styles.cardTitle}>Batches</Title>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total:</Text>
                    <Text style={styles.statValue}>{stats.batches.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Pending:</Text>
                    <Text style={[styles.statValue, { color: theme.colors.notification }]}>
                      {stats.batches.pending}
                    </Text>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <Button 
                    mode="text" 
                    onPress={() => navigation.navigate('Batches')}
                    color={theme.colors.primary}
                  >
                    View All
                  </Button>
                </Card.Actions>
              </Card>
              
              <Card style={styles.statsCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Ionicons name="cube" size={24} color={theme.colors.primary} />
                    <Title style={styles.cardTitle}>Crates</Title>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total:</Text>
                    <Text style={styles.statValue}>{stats.crates.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Available:</Text>
                    <Text style={[styles.statValue, { color: theme.colors.success }]}>
                      {stats.crates.available}
                    </Text>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <Button 
                    mode="text" 
                    onPress={() => navigation.navigate('Crates')}
                    color={theme.colors.primary}
                  >
                    View All
                  </Button>
                </Card.Actions>
              </Card>
            </View>
          </View>
          
          {/* Recent Activity */}
          <View style={styles.recentActivityContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.activityCard}>
              <Card.Content>
                <View style={styles.activityItem}>
                  <Avatar.Icon size={40} icon="cube" style={{ backgroundColor: theme.colors.primary }} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>New Crate Created</Text>
                    <Text style={styles.activityTime}>Today, 10:30 AM</Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.activityItem}>
                  <Avatar.Icon size={40} icon="archive" style={{ backgroundColor: theme.colors.accent }} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>Batch #1234 Departed</Text>
                    <Text style={styles.activityTime}>Yesterday, 3:45 PM</Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.activityItem}>
                  <Avatar.Icon size={40} icon="check-circle" style={{ backgroundColor: theme.colors.success }} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>Reconciliation Completed</Text>
                    <Text style={styles.activityTime}>May 12, 2025</Text>
                  </View>
                </View>
              </Card.Content>
              <Card.Actions>
                <Button mode="text" color={theme.colors.primary}>
                  View All Activity
                </Button>
              </Card.Actions>
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  logoutIcon: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  quickActionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.colors.text,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  statsCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '48%',
    elevation: 2,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    marginLeft: 8,
    color: theme.colors.text,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.placeholder,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  recentActivityContainer: {
    padding: 20,
    paddingTop: 0,
    marginBottom: 20,
  },
  activityCard: {
    borderRadius: 12,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityInfo: {
    marginLeft: 15,
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  activityTime: {
    fontSize: 14,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  divider: {
    marginVertical: 8,
  },
});
