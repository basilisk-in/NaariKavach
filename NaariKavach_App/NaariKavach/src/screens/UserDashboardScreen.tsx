import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { UserTabParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import api from '../services/services';
import * as Location from 'expo-location';

type UserDashboardScreenNavigationProp = BottomTabNavigationProp<UserTabParamList, 'Home'>;

interface Props {
  navigation: UserDashboardScreenNavigationProp;
}

export default function UserDashboardScreen({ navigation }: Props): React.JSX.Element {
  const [isSafe, setIsSafe] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async (): Promise<void> => {
    try {
      setIsLoadingLocation(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use this feature. Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(currentLocation);
      console.log('Current location:', currentLocation.coords);
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };
  const handleEmergencyPress = async (): Promise<void> => {
    setIsSafe(false);
    
    if (location) {
      const { latitude, longitude } = location.coords;
      console.log('Emergency triggered at:', { latitude, longitude });
      
      Alert.alert(
        'Emergency Alert', 
        `Emergency alert sent! Your current location (${latitude.toFixed(6)}, ${longitude.toFixed(6)}) has been shared with authorities and emergency contacts.`
      );
      
      // Here you can add API call to create SOS with location
      const response = await api.auth.getCurrentUser();
      if (response.success && response.data?.username) {
        const res = await api.sos.createSOS(response.data?.username, 1, latitude, longitude);
        console.log('SOS created:', res);
      }
      // api.sos.createSOS('Emergency', 1, latitude, longitude);
    } else {
      Alert.alert(
        'Emergency Alert', 
        'Some error occured.'
      );
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
          </TouchableOpacity> 
          <Text style={styles.headerTitle}>Naari कवच</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.questionText}>Are you feeling unsafe?</Text>

          {/* Hero Image Placeholder */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="shield-outline" size={100} color={colors.gray} />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={handleEmergencyPress}
          >
            <Text style={styles.emergencyButtonText}>I'm Feeling Unsafe</Text>
          </TouchableOpacity>

          <Text style={styles.descriptionText}>
            Share your location with police and selected contacts
          </Text>

          <Text style={styles.sectionTitle}>Safety Status</Text>          
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, !isSafe && styles.unsafeStatusIcon]}>
              <Ionicons 
                name={isSafe ? "checkmark-circle" : "warning"} 
                size={24} 
                color={isSafe ? colors.darkGray : colors.white} 
              />
            </View>
            <Text style={styles.statusText}>{isSafe ? 'Safe' : 'Unsafe'}</Text>
          </View>

          {/* Location Status Card */}
          <TouchableOpacity 
            style={styles.statusCard}
            onPress={getCurrentLocation}
          >
            <View style={[styles.statusIcon, !isSafe && styles.unsafeStatusIcon]}>
              {isSafe ?
                <Ionicons 
                  name={locationPermission === 'granted' && location ? "location" : "location-outline"} 
                  size={24} 
                  color={locationPermission === 'granted' && location ? "#4CAF50" : colors.darkGray} 
                />
                : <Ionicons 
                    name="alert-circle" 
                    size={24} 
                    color={colors.white}
                  />
              }
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.statusText}>
                {isSafe ? 
                  isLoadingLocation 
                    ? 'Getting location...' 
                    : locationPermission === 'granted' && location
                      ? 'Location tracked'
                      : 'Tap to enable location'
                  : "Distress signal sent"
                }
              </Text>
              {location && (
                <Text style={styles.locationCoords}>
                  {`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statusCard}
            onPress={() => navigation.navigate('Safety')}
          >
            <View style={styles.statusIcon}>
              <Ionicons name="people" size={24} color={colors.darkGray} />
            </View>
            <Text style={styles.statusText}>Share Location with Family/Friends</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  emergencyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: spacing.lg,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },  statusIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsafeStatusIcon: {
    backgroundColor: '#FF4444',
  },
  loadingStatusIcon: {
    backgroundColor: '#FFFFFF',
  },
  locationInfo: {
    flex: 1,
  },
  locationCoords: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  statusText: {
    fontSize: 16,
    color: colors.darkGray,
    flex: 1,
  },
});
