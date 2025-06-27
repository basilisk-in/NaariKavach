import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Linking, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { UserTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import api, { EmergencyContact, emergencyContactsManager } from '../services/services';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import io, { Socket } from 'socket.io-client';
import { LandingSvg } from '../components/LandingSvg';

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

  // Internet connection and WebSocket state
  const [hasInternetConnection, setHasInternetConnection] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isUsingWebSocket, setIsUsingWebSocket] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // WebSocket server IP configuration
  const [webSocketIP, setWebSocketIP] = useState('192.168.137.1:8002');
  const [inputWebSocketIP, setInputWebSocketIP] = useState('192.168.137.1:8002');
  const [showIPModal, setShowIPModal] = useState(false);
  
  // Dynamic WebSocket server URL based on current IP
  const getWebSocketServerURL = () => `http://${webSocketIP}`;

  // Load WebSocket IP from AsyncStorage
  const loadWebSocketIP = async (): Promise<void> => {
    try {
      const savedIP = await AsyncStorage.getItem('webSocketIP');
      if (savedIP) {
        setWebSocketIP(savedIP);
        setInputWebSocketIP(savedIP);
      }
    } catch (error) {
      console.error('Error loading WebSocket IP from storage:', error);
    }
  };

  // Save WebSocket IP to AsyncStorage
  const saveWebSocketIP = async (ip: string): Promise<void> => {
    try {
      await AsyncStorage.setItem('webSocketIP', ip);
      const previousIP = webSocketIP;
      setWebSocketIP(ip);
      
      // Disconnect existing WebSocket if connected
      if (socketRef.current) {
        console.log('🔄 Disconnecting from previous WebSocket:', previousIP);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Reconnect with new IP after a short delay
      setTimeout(() => {
        console.log('🔌 Connecting to new WebSocket IP:', ip);
        initializeWebSocket();
      }, 1000);
      
      Toast.show({
        type: 'success',
        text1: 'WebSocket IP Updated',
        text2: `Reconnecting to: ${ip}`,
        position: 'bottom',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('Error saving WebSocket IP to storage:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save WebSocket IP',
        position: 'bottom',
      });
    }
  };

  // Handle WebSocket IP update
  const handleUpdateWebSocketIP = (): void => {
    const trimmedIP = inputWebSocketIP.trim();
    
    if (!trimmedIP) {
      Toast.show({
        type: 'error',
        text1: 'Invalid IP',
        text2: 'Please enter a valid IP address and port',
        position: 'bottom',
      });
      return;
    }

    // Check if the IP is different from current
    if (trimmedIP === webSocketIP) {
      Toast.show({
        type: 'info',
        text1: 'No Change',
        text2: 'This IP is already configured',
        position: 'bottom',
      });
      setShowIPModal(false);
      return;
    }

    // Show confirmation before changing IP
    Alert.alert(
      'Update WebSocket IP',
      `Change WebSocket server from:\n${webSocketIP}\n\nTo:\n${trimmedIP}\n\nThis will disconnect and reconnect the WebSocket connection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            saveWebSocketIP(trimmedIP);
            setShowIPModal(false);
          }
        }
      ]
    );
  };

  // Load WebSocket IP from storage on mount
  useEffect(() => {
    loadWebSocketIP();
  }, []);

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

  // Check internet connection and initialize WebSocket if needed
  useEffect(() => {
    checkInternetConnection();
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up WebSocket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
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

  // Internet connection check function
  const checkInternetConnection = async (): Promise<void> => {
    try {
      setIsCheckingConnection(true);
      
      // Try to fetch from a reliable endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setHasInternetConnection(true);
        setIsUsingWebSocket(false);
        console.log('✅ Internet connection available - using normal API');
        
        Toast.show({
          type: 'success',
          text1: 'Connection Status',
          text2: 'Internet connection available',
          position: 'bottom',
          visibilityTime: 2000,
        });
      } else {
        throw new Error('No internet connection');
      }
    } catch (error) {
      console.log('❌ No internet connection - switching to WebSocket mode');
      setHasInternetConnection(false);
      setIsUsingWebSocket(true);
      
      Toast.show({
        type: 'info',
        text1: 'Offline Mode',
        text2: 'No internet detected. Using local WebSocket connection.',
        position: 'bottom',
        visibilityTime: 3000,
      });
      
      // Initialize WebSocket connection
      initializeWebSocket();
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Initialize WebSocket connection
  const initializeWebSocket = (): void => {
    try {
      const serverURL = getWebSocketServerURL();
      console.log('🔌 Initializing WebSocket connection to:', serverURL);
      
      const socket = io(serverURL, {
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        Toast.show({
          type: 'success',
          text1: 'WebSocket Connected',
          text2: 'Local emergency system ready',
          position: 'bottom',
          visibilityTime: 2000,
        });
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        Toast.show({
          type: 'error',
          text1: 'WebSocket Disconnected',
          text2: 'Connection to local emergency system lost',
          position: 'bottom',
        });
      });

      socket.on('connect_error', (error) => {
        console.error('🚨 WebSocket connection error:', error);
        Toast.show({
          type: 'error',
          text1: 'WebSocket Error',
          text2: 'Failed to connect to local emergency system',
          position: 'bottom',
        });
      });

      // Listen for SOS creation response
      socket.on('create_sos_response', (data) => {
        console.log('📡 Received create_sos_response:', data);
        if (data.success && data.data?.sos_id) {
          setSosId(data.data.sos_id);
          console.log('✅ SOS created via WebSocket with ID:', data.data.sos_id);
          Toast.show({
            type: 'success',
            text1: 'Emergency Alert Created',
            text2: `SOS ID: ${data.data.sos_id}`,
            position: 'bottom',
          });
        } else {
          console.error('❌ Failed to create SOS via WebSocket:', data.error);
          Toast.show({
            type: 'error',
            text1: 'SOS Creation Failed',
            text2: data.error || 'Unknown error',
            position: 'bottom',
          });
        }
      });

      // Listen for location update response
      socket.on('update_location_response', (data) => {
        console.log('📍 Received update_location_response:', data);
        if (data.success) {
          const updateTime = new Date();
          setLastLocationUpdate(updateTime);
          setLocationUpdateCount(prev => prev + 1);
          console.log('✅ Location updated via WebSocket');
        } else {
          console.error('❌ Failed to update location via WebSocket:', data.error);
          Toast.show({
            type: 'error',
            text1: 'Location Update Failed',
            text2: data.error || 'Unknown error',
            position: 'bottom',
          });
        }
      });

    } catch (error) {
      console.error('🚨 Error initializing WebSocket:', error);
      Toast.show({
        type: 'error',
        text1: 'WebSocket Initialization Failed',
        text2: 'Could not set up local emergency connection',
        position: 'bottom',
      });
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

      // Choose between API or WebSocket based on connection status
      if (hasInternetConnection && !isUsingWebSocket) {
        // Use normal API call
        const apiPromise = api.sos.updateLocation(sosId, latitude, longitude);
        const apiTimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API request timeout')), 8000)
        );

        const response = await Promise.race([apiPromise, apiTimeoutPromise]);
        
        if (response.success) {
          console.log('✅ Location updated via API:', response.data);
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
      } else if (isUsingWebSocket && socketRef.current?.connected) {
        // Use WebSocket
        console.log('📡 Sending location update via WebSocket');
        socketRef.current.emit('update_location', {
          "sos_request": sosId,
          "latitude": latitude,
          "longitude": longitude
        });
        
        // Note: Response will be handled by the 'update_location_response' listener
        // Return true for now since the response is async
        return true;
      } else {
        // No connection available
        Toast.show({
          type: 'error',
          text1: 'No Connection',
          text2: 'Cannot update location - no internet or WebSocket connection',
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
          console.log("isUsingWebSocket:", isUsingWebSocket, socketRef.current?.connected);
          if (hasInternetConnection && !isUsingWebSocket) {
            // Use normal API call
            const response = await api.auth.getCurrentUser();
            const res = await api.sos.createSOS(response.data?.username || "guest", 0, latitude, longitude);
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
          } else if (isUsingWebSocket && socketRef.current?.connected) {
            // Use WebSocket
            console.log('📡 Creating SOS via WebSocket');
            
            // For WebSocket, we'll use a default name since we can't get user info
            const sosData = {
              "name": `Emergency-${Date.now()}`, // Generate unique name
              "sos_type": 0,
              "initial_latitude": latitude,
              "initial_longitude": longitude
            };
            
            socketRef.current.emit('create_sos', sosData);
            console.log('📡 SOS creation request sent via WebSocket');
            
            // Response will be handled by the 'create_sos_response' listener
          } else {
            // No connection available
            Toast.show({
              type: 'error',
              text1: 'No Connection',
              text2: 'Cannot create emergency alert - no internet or WebSocket connection',
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
          <View style={styles.headerLeftSection}>
            {!isCheckingConnection && (
              <View style={[
                styles.connectionBadge, 
                { backgroundColor: hasInternetConnection ? '#4CAF50' : isUsingWebSocket ? '#FF9800' : socketRef.current?.connected ? '#F44336' : "#4CAF50"}
              ]}>
                <Text style={styles.connectionBadgeText}>
                  {hasInternetConnection ? 'Online' : isUsingWebSocket ? 'WebSocket' : 'Offline'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Naari कवच</Text>
          </View>
          <View style={styles.headerRightSection}>
            <TouchableOpacity 
              onPress={() => setShowIPModal(true)}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={24} color={colors.darkGray} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.questionText}>Are you feeling unsafe?</Text>

          {/* Hero Image Placeholder */}
          <View style={styles.imageContainer}>
            <LandingSvg width={280} height={245} fill={colors.darkGray} />
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

          {/* Connection retry option - only show when there's an issue */}
          {(!hasInternetConnection && !isUsingWebSocket) && (
            <TouchableOpacity 
              style={styles.statusCard}
              onPress={checkInternetConnection}
              disabled={isCheckingConnection}
            >
              <View style={styles.statusIcon}>
                <Ionicons 
                  name={isCheckingConnection ? "refresh" : "wifi-outline"} 
                  size={24} 
                  color={isCheckingConnection ? "#FF9800" : "#2196F3"} 
                />
              </View>
              <Text style={styles.statusText}>
                {isCheckingConnection ? 'Checking connection...' : 'Retry Connection'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* WebSocket IP Configuration Modal */}
      <Modal
        visible={showIPModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>WebSocket Server Configuration</Text>
              <TouchableOpacity 
                onPress={() => setShowIPModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.darkGray} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter the IP address and port of your WebSocket server for emergency communication when internet is unavailable.
            </Text>
            
            <Text style={styles.inputLabel}>Server IP:Port</Text>
            <TextInput
              style={styles.ipInput}
              value={inputWebSocketIP}
              onChangeText={setInputWebSocketIP}
              placeholder="192.168.1.100:8002"
              placeholderTextColor={colors.gray}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <Text style={styles.currentIPText}>
              Current: {webSocketIP}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setInputWebSocketIP(webSocketIP);
                  setShowIPModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleUpdateWebSocketIP}
              >
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRightSection: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
  },
  connectionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 60,
  },
  connectionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
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
  settingsButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.small,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  ipInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  currentIPText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.lightGray,
  },
  updateButton: {
    backgroundColor: colors.black,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
