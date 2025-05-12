// src/screens/crates/CrateDetailsScreen.js
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCrateById } from '../../store/slices/crateSlice';
import * as Location from 'expo-location';
import { Card, Title, Paragraph, Divider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { format } from 'date-fns';

export default function CrateDetailsScreen({ route, navigation }) {
  // Add proper null checks and default values
  const { crate: initialCrate, crateId } = (route && route.params) ? route.params : {};
  const dispatch = useDispatch();
  const { currentCrate, loading, error } = useSelector((state) => state.crates);

  // Either use the crate passed in params or fetch by ID
  useEffect(() => {
    if (crateId) {
      dispatch(fetchCrateById(crateId));
    }
  }, [crateId, dispatch]);

  // Use initial crate from params or the fetched current crate with proper null check
  const crate = initialCrate || currentCrate || null;
  
  // State for location display
  const [locationDisplay, setLocationDisplay] = useState('');
  
  // Get city name from coordinates when crate data is available
  useEffect(() => {
    if (crate && crate.gps_location) {
      (async () => {
        try {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: crate.gps_location.lat,
            longitude: crate.gps_location.lng,
          });
          
          if (geocode && geocode.length > 0) {
            const { city, district, subregion, region } = geocode[0];
            // Use the most specific location available
            const locationName = city || district || subregion || region || 'Unknown';
            setLocationDisplay(
              `${locationName} (${crate.gps_location.lat.toFixed(4)}, ${crate.gps_location.lng.toFixed(4)})`
            );
          } else {
            setLocationDisplay('');
          }
        } catch (error) {
          console.log('Error getting location name:', error);
          setLocationDisplay('');
        }
      })();
    }
  }, [crate]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading crate details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.error}
        />
        <Text style={styles.errorText}>
          {error.message || 'Failed to load crate details'}
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  if (!crate) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="help-circle-outline"
          size={48}
          color={theme.colors.placeholder}
        />
        <Text style={styles.errorText}>Crate not found</Text>
        <Button
          mode="contained"
          onPress={() => {
            try {
              navigation.goBack();
            } catch (e) {
              // If goBack fails, navigate to the CrateList screen
              navigation.navigate('CrateList');
            }
          }}
          style={styles.errorButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  // Format quality grade for display
  const getQualityLabel = (grade) => {
    switch (grade) {
      case 'A':
        return 'A - Premium';
      case 'B':
        return 'B - Standard';
      case 'C':
        return 'C - Processing';
      case 'reject':
        return 'Reject';
      default:
        return grade || 'Not Specified';
    }
  };

  // Get quality grade color
  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A':
        return '#4CAF50'; // Green
      case 'B':
        return '#2196F3'; // Blue
      case 'C':
        return '#FF9800'; // Orange
      case 'reject':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return format(new Date(dateString), 'MMMM d, yyyy h:mm a');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Crate Details</Title>
      </View>
      
      <Card style={styles.qrCard}>
        <Card.Content>
          <View style={styles.qrContainer}>
            <Ionicons name="qr-code" size={28} color={theme.colors.primary} style={styles.qrIcon} />
            <View>
              <Text style={styles.qrLabel}>QR Code</Text>
              <Text style={styles.qrCode}>{crate.qr_code}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {crate.photo_url && (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: crate.photo_url }}
            style={styles.photo}
            resizeMode="cover"
          />
        </View>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Title>Mango Information</Title>
          <Divider style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Variety:</Text>
            <Text style={styles.infoValue}>{crate.variety_name}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>{crate.weight} kg</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Quality Grade:</Text>
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: getQualityColor(crate.quality_grade) },
              ]}
            >
              <Text style={styles.gradeText}>
                {getQualityLabel(crate.quality_grade)}
              </Text>
            </View>
          </View>

          {crate.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notes}>{crate.notes}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Harvest Details</Title>
          <Divider style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Harvest Date:</Text>
            <Text style={styles.infoValue}>
              {formatDate(crate.harvest_date)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Supervisor:</Text>
            <Text style={styles.infoValue}>{crate.supervisor_name}</Text>
          </View>

          {crate.gps_location && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>GPS Location:</Text>
              <Text style={styles.infoValue}>
                {locationDisplay || `Lat: ${crate.gps_location.lat.toFixed(6)}, Lng: ${crate.gps_location.lng.toFixed(6)}`}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {crate.batch_id && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Batch Information</Title>
            <Divider style={styles.divider} />

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Batch Code:</Text>
              <Text style={styles.infoValue}>{crate.batch_code}</Text>
            </View>

            <Button
              mode="outlined"
              icon={() => (
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              )}
              onPress={() =>
                navigation.navigate('BatchDetail', { batchId: crate.batch_id })
              }
              style={styles.viewBatchButton}
            >
              View Batch Details
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  qrCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    color: 'white',
    fontSize: 24,
    marginBottom: 10,
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrIcon: {
    marginRight: 12,
  },
  qrLabel: {
    fontSize: 14,
    color: '#666',
  },
  qrCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  photoContainer: {
    margin: 16,
    marginTop: -20,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    backgroundColor: 'white',
  },
  photo: {
    width: '100%',
    height: 250,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
  },
  divider: {
    marginVertical: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gradeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  notes: {
    fontSize: 16,
    color: theme.colors.text,
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  viewBatchButton: {
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorButton: {
    marginTop: 10,
  },
});
