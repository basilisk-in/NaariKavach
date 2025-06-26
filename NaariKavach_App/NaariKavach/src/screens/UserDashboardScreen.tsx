import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { UserTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import api, { EmergencyContact, emergencyContactsManager } from '../services/services';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

type UserDashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<UserTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: UserDashboardScreenNavigationProp;
}

export default function UserDashboardScreen({ navigation }: Props): React.JSX.Element {
  const [isSafe, setIsSafe] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [sosId, setSosId] = useState<number>(0);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [locationUpdateCount, setLocationUpdateCount] = useState(0);

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Cleanup location tracking interval on unmount
  useEffect(() => {
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, [locationUpdateInterval]);

  // Start/stop location tracking based on safety status
  useEffect(() => {
    // Use setTimeout to avoid blocking the UI thread
    const handleTrackingChange = async () => {
      if (!isSafe && sosId > 0 && !isTrackingLocation) {
        await startLocationTracking();
      } else if ((isSafe || sosId === 0) && isTrackingLocation) {
        stopLocationTracking();
      }
    };

    // Use setTimeout to make this non-blocking
    const timeoutId = setTimeout(handleTrackingChange, 100);

    return () => clearTimeout(timeoutId);
  }, [isSafe, sosId, isTrackingLocation]);

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
      
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: 'Unable to get your current location. Please check your location settings.',
        position: 'bottom',
      });
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const startLocationTracking = async (): Promise<void> => {
    if (isTrackingLocation || !sosId) {
      return;
    }

    setIsTrackingLocation(true);

    // Update location immediately (don't await to avoid blocking)
    updateLocationToSOS().catch(error => {
      Toast.show({
        type: 'error',
        text1: 'Location Update Failed',
        text2: 'Initial location update failed, but tracking will continue',
        position: 'bottom',
      });
    });

    // Set up interval to update location every 5 seconds
    const interval = setInterval(() => {
      // Check if we should stop tracking
      if (isSafe || sosId === 0) {
        stopLocationTracking();
        return;
      }

      // Update location without blocking the interval
      updateLocationToSOS().catch(error => {
        Toast.show({
          type: 'error',
          text1: 'Location Update Failed',
          text2: 'Scheduled location update failed, will retry in 5 seconds',
          position: 'bottom',
        });
      });
    }, 5000); // Update every 5 seconds

    setLocationUpdateInterval(interval);
  };

  const stopLocationTracking = (): void => {
    if (!isTrackingLocation && !locationUpdateInterval) {
      return; // Already stopped
    }

    setIsTrackingLocation(false);
    
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }

    // Reset tracking counters
    setLocationUpdateCount(0);
    setLastLocationUpdate(null);
  };

  const updateLocationToSOS = async (): Promise<boolean> => {
    try {
      if (!sosId) {
        return false;
      }

      // Get fresh location with timeout to prevent hanging
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // Minimum time between location updates
        distanceInterval: 0, // No minimum distance
      });

      // Add timeout to location request (10 seconds max)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Location request timeout')), 10000)
      );

      const currentLocation = await Promise.race([locationPromise, timeoutPromise]);
      
      // Update location state (non-blocking)
      setLocation(currentLocation);
      
      const { latitude, longitude } = currentLocation.coords;
      const timestamp = new Date().toISOString();

      // Make API call with timeout
      const apiPromise = api.sos.updateLocation(sosId, latitude, longitude);
      const apiTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('API request timeout')), 8000)
      );

      const response = await Promise.race([apiPromise, apiTimeoutPromise]);
      
      if (response.success) {
        const updateTime = new Date();
        setLastLocationUpdate(updateTime);
        setLocationUpdateCount(prev => prev + 1);
        return true;
      } else {
        Toast.show({
          type: 'error',
          text1: 'API Error',
          text2: `Location update failed: ${response.error}`,
          position: 'bottom',
        });
        return false;
      }

    } catch (error) {
      const timestamp = new Date().toISOString();
      
      // Don't stop tracking on single failures, just log and continue
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          Toast.show({
            type: 'error',
            text1: 'Timeout Error',
            text2: 'Location/API timeout - will retry in 5 seconds',
            position: 'bottom',
          });
        } else if (error.message.includes('Location request failed')) {
          Toast.show({
            type: 'error',
            text1: 'Location Service Error',
            text2: 'Location service error - will retry in 5 seconds',
            position: 'bottom',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Location Update Error',
            text2: `Error updating location: ${error.message}`,
            position: 'bottom',
          });
        }
      }
      return false;
    }
  };

  const handleEmergencyPress = async (): Promise<void> => {
    // Immediately set unsafe status for responsive UI
    setIsSafe(false);
    
    if (location) {
      const { latitude, longitude } = location.coords;
      console.log('Emergency triggered at:', { latitude, longitude });
      
      // Show immediate feedback
      Alert.alert(
        'Emergency Alert', 
        `Emergency alert sent! Your current location (${latitude.toFixed(6)}, ${longitude.toFixed(6)}) has been shared with authorities and emergency contacts.`
      );
      
      // Create SOS in background (non-blocking for UI responsiveness)
      const createSOSAndStartTracking = async () => {
        try {
          const response = await api.auth.getCurrentUser();
          if (response.success && response.data?.username) {
            const res = await api.sos.createSOS(response.data?.username, 1, latitude, longitude);
            console.log('SOS created:', res);
            if (res.success && res.data?.sos_id) {
              setSosId(res.data?.sos_id);
              console.log('SOS ID set, location tracking will start automatically');
            } else {
              Toast.show({
                type: 'error',
                text1: 'SOS Creation Failed',
                text2: `Failed to create SOS: ${res.error}`,
                position: 'bottom',
              });
              // Don't revert isSafe here, let user manually mark as safe
            }
          } else {
            Toast.show({
              type: 'error',
              text1: 'User Authentication Failed',
              text2: `Failed to get current user: ${response.error}`,
              position: 'bottom',
            });
          }
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Emergency Setup Error',
            text2: 'Error in creating emergency alert setup',
            position: 'bottom',
          });
        }
      };

      // Execute SOS creation in background
      createSOSAndStartTracking();
      
    } else {
      // Try to get location and then create SOS
      Alert.alert(
        'Getting Location', 
        'Getting your current location for emergency alert...'
      );
      
      const getLocationAndCreateSOS = async () => {
        try {
          await getCurrentLocation();
          // getCurrentLocation will update the location state
          // The useEffect will handle the rest when location is available
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Location Error',
            text2: 'Error getting location for emergency',
            position: 'bottom',
          });
          Alert.alert(
            'Location Error', 
            'Unable to get your location. Emergency status has been set, but location sharing may be limited.'
          );
        }
      };

      getLocationAndCreateSOS();
    }
  };

  const handleSafePress = (): void => {
    Alert.alert(
      'Mark as Safe',
      'Are you sure you want to mark yourself as safe? This will stop location tracking and close the emergency alert.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I\'m Safe',
          onPress: () => {
            setIsSafe(true);
            setSosId(0); // Clear SOS ID
            stopLocationTracking(); // Explicitly stop tracking
            Alert.alert(
              'Status Updated', 
              'You have been marked as safe. Location tracking has been stopped.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number starts with country code, use as is
    // If it's a local number, add country code (assuming Indian numbers)
    if (cleaned.length === 10) {
      // Assuming Indian numbers, add +91
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add country code
      cleaned = '91' + cleaned.substring(1);
    }
    
    return cleaned;
  };

  const shareLocationViaWhatsApp = async (contact: EmergencyContact, location: Location.LocationObject): Promise<boolean> => {
    try {
      const phoneNumber = formatPhoneNumber(contact.phoneNumber);
      const { latitude, longitude } = location.coords;
      
      // Create emergency location message with live location
      const emergencyMessage = `Emergency Alert from NaariKavach \n\nI'm sharing my current location with you for safety purposes, I hope that you can monitor my journey!.\n\nLocation: https://maps.google.com/maps?q=${latitude},${longitude}\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nPlease check on me if you don't hear from me soon.\n\n- Sent via NaariKavach. Your Safety, Our Priority~`;
      
      // Create WhatsApp URL
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(emergencyMessage)}`;
      
      // Check if WhatsApp can be opened
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        // Fallback to web WhatsApp
        const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(emergencyMessage)}`;
        await Linking.openURL(webWhatsappUrl);
        return true;
      }
      
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'WhatsApp Share Failed',
        text2: `Error sharing emergency alert via WhatsApp: ${error instanceof Error ? error.message : 'Unknown error'}`,
        position: 'bottom',
      });
      return false;
    }
  };

  const emergency = async (): Promise<void> => {
    try {
      // Get current location first
      const currentLocation = location || await getCurrentLocation();
      
      if (!currentLocation) {
        Alert.alert(
          'Location Required',
          'Unable to get your current location. Please enable location services and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get emergency contacts
      const emergencyContacts = await emergencyContactsManager.getEmergencyContacts();
      
      if (emergencyContacts.length === 0) {
        Alert.alert(
          'No Emergency Contacts',
          'You haven\'t set up any emergency contacts yet. Would you like to add some now?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Add Contacts', 
              onPress: () => navigation.navigate('EmergencyContacts')
            }
          ]
        );
        return;
      }

      // Confirm emergency alert
      Alert.alert(
        '🚨 Emergency Alert',
        `Send emergency location alert to ${emergencyContacts.length} emergency contact${emergencyContacts.length > 1 ? 's' : ''}?\n\nThis will share your live location for the next 1 hour.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Emergency Alert',
            style: 'destructive',
            onPress: async () => {
              try {
                // Show sending progress
                Alert.alert(
                  'Sending Emergency Alert',
                  'Please wait while we notify your emergency contacts...',
                  [],
                  { cancelable: false }
                );

                let successCount = 0;
                let failureCount = 0;
                
                // Send WhatsApp messages to all emergency contacts
                for (const contact of emergencyContacts) {
                  const success = await shareLocationViaWhatsApp(contact, currentLocation);
                  if (success) {
                    successCount++;
                  } else {
                    failureCount++;
                  }
                  
                  // Small delay between messages to avoid overwhelming WhatsApp
                  await new Promise(resolve => setTimeout(resolve, 1500));
                }

                // Show result after a brief delay
                setTimeout(() => {
                  if (successCount === emergencyContacts.length) {
                    Alert.alert(
                      '✅ Emergency Alert Sent',
                      `Your emergency location has been shared with all ${successCount} emergency contact${successCount > 1 ? 's' : ''} via WhatsApp.\n\nThey will be able to monitor your location for the next hour.`,
                      [{ text: 'OK' }]
                    );
                  } else if (successCount > 0) {
                    Alert.alert(
                      '⚠️ Partially Sent',
                      `Emergency alert sent to ${successCount} contact${successCount > 1 ? 's' : ''}. ${failureCount} contact${failureCount > 1 ? 's' : ''} could not be reached.\n\nPlease ensure WhatsApp is installed and contacts have valid phone numbers.`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    Alert.alert(
                      '❌ Failed to Send',
                      'Unable to send emergency alerts via WhatsApp. Please make sure WhatsApp is installed and try again.',
                      [{ text: 'OK' }]
                    );
                  }
                }, 1000);

                // Set unsafe status
                setIsSafe(false);

              } catch (error) {
                Toast.show({
                  type: 'error',
                  text1: 'Emergency Alert Failed',
                  text2: 'Failed to send emergency alerts. Please try again.',
                  position: 'bottom',
                });
                Alert.alert(
                  'Error',
                  'Failed to send emergency alerts. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Emergency Function Error',
        text2: 'An error occurred while preparing the emergency alert',
        position: 'bottom',
      });
      Alert.alert(
        'Error',
        'An error occurred while preparing the emergency alert. Please try again.',
        [{ text: 'OK' }]
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

          {
            isSafe ? (
              <TouchableOpacity 
                style={styles.emergencyButton}
                onPress={handleEmergencyPress}
              >
                <Text style={styles.emergencyButtonText}>I'm Feeling Unsafe</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.safeButton]}
                onPress={handleSafePress}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isTrackingLocation && (
                    <Ionicons name="radio" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.emergencyButtonText}>
                    {isTrackingLocation ? 'I\'m Feeling Safe (Tracking...)' : 'I\'m Feeling Safe'}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }

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
                    name={isTrackingLocation ? "radio" : "alert-circle"} 
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
                  : isTrackingLocation 
                    ? `Live tracking active (SOS: ${sosId}) - ${locationUpdateCount} updates`
                    : "Distress signal sent"
                }
              </Text>
              {location && (
                <Text style={styles.locationCoords}>
                  {`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`}
                  {isTrackingLocation && (
                    <Text style={{ color: '#4CAF50' }}>
                      {` • Live${lastLocationUpdate ? ` (${lastLocationUpdate.toLocaleTimeString()})` : ''}`}
                    </Text>
                  )}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statusCard}
            onPress={() => emergency()}
          >
            <View style={styles.statusIcon}>
              <Ionicons name="warning" size={24} color="#FF4444" />
            </View>
            <Text style={styles.statusText}>Send Emergency Alert to Contacts</Text>
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
  safeButton: {
    backgroundColor: "#4CAF50",
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
