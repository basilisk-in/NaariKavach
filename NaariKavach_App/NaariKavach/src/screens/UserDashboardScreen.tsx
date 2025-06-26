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
      console.error('Error sharing emergency alert via WhatsApp:', error);
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
                console.error('Error sending emergency alerts:', error);
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
      console.error('Error in emergency function:', error);
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
