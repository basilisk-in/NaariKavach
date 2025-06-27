import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PoliceTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import MapView, { Region, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

type PoliceDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<PoliceTabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

type PoliceDashboardRouteProp = RouteProp<PoliceTabParamList, 'Dashboard'>;

interface SOSLocationUpdate {
  sos_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ResolvedSOS {
  sos_id: string;
  resolvedAt: string;
  resolvedBy: string;
  latitude?: number;
  longitude?: number;
  responseTime: string;
}

interface Props {
  navigation: PoliceDashboardNavigationProp;
  route: PoliceDashboardRouteProp;
}

export default function PoliceDashboardScreen({ navigation, route }: Props): React.JSX.Element {
  const { unitId } = route.params || { unitId: 'Unknown' };
  console.log("Unit ID:", unitId);
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sosLocations, setSOSLocations] = useState<Map<string, SOSLocationUpdate>>(new Map());
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedSOS, setSelectedSOS] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  
  // Drawer animation and gesture handling
  const screenHeight = Dimensions.get('window').height;
  const minDrawerHeight = 60;
  const maxDrawerHeight = Math.min(400, screenHeight * 0.6);
  const defaultOpenHeight = 300;
  
  const drawerHeight = useRef(new Animated.Value(minDrawerHeight)).current;
  const lastDrawerHeight = useRef(minDrawerHeight);
  const panGestureRef = useRef(null);
  const { logout, isAuthenticated } = useAuth(); // Get isAuthenticated state
  
  // Monitor authentication state and redirect when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🚪 Authentication lost, redirecting to splash...');
      // Navigate to the splash screen - try multiple approaches
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Splash' }],
          })
        );
      } else {
        // Fallback: try direct navigation
        (navigation as any).navigate('Splash');
      }
    }
  }, [isAuthenticated, navigation]);
  
  // Recent SOS history from AsyncStorage
  const [recentHistory, setRecentHistory] = useState<ResolvedSOS[]>([]);

  // Load recent resolved SOS history from AsyncStorage
  useEffect(() => {
    loadRecentHistory();
  }, []);

  // Add focus listener to refresh recent history when user returns to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRecentHistory();
    });

    return unsubscribe;
  }, [navigation]);

  const loadRecentHistory = async (): Promise<void> => {
    try {
      const storedHistory = await AsyncStorage.getItem('resolved_sos');
      if (storedHistory) {
        const resolvedSOSData: ResolvedSOS[] = JSON.parse(storedHistory);
        setRecentHistory(resolvedSOSData.slice(0, 10)); // Show last 10 resolved SOS
      }
    } catch (error) {
      console.error('Error loading recent history:', error);
    }
  };

  const storeAssignedSOSFromUpdate = async (data: SOSLocationUpdate): Promise<void> => {
    try {
      const existingAssigned = await AsyncStorage.getItem(`assigned_sos_${unitId}`);
      const assignedSOSList = existingAssigned ? JSON.parse(existingAssigned) : [];
      
      // Check if SOS is already assigned
      const alreadyAssigned = assignedSOSList.find((item: any) => item.sos_id === data.sos_id);
      if (!alreadyAssigned) {
        const newSOS = {
          sos_id: data.sos_id,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          status: 'assigned' as const,
          priority: 'high' as const, // Default priority for incoming SOS
        };
        
        const updatedList = [...assignedSOSList, newSOS];
        await AsyncStorage.setItem(`assigned_sos_${unitId}`, JSON.stringify(updatedList));
        console.log(`📱 SOS ${data.sos_id} stored as assigned to unit ${unitId}`);
      }
    } catch (error) {
      console.error('Error storing assigned SOS from update:', error);
    }
  };
  
  const socketRef = useRef<Socket | null>(null);
  
  // Default region (will be used if location permission is denied or location cannot be fetched)
  const defaultRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };
  
  const [region, setRegion] = useState<Region>(defaultRegion);
  const mapRef = useRef<MapView | null>(null);

  // WebSocket connection and officer room join
  useEffect(() => {
    const initializeSocket = () => {
      try {
        // Initialize socket connection - update with your actual server URL
        const socket = io('http://192.168.137.1:8001', {
          transports: ['websocket'],
          timeout: 20000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔗 Socket connected');
          setIsSocketConnected(true);
          
          // Officers join by their unit number
          socket.emit('join_officer_room', {
            unit_number: unitId
          });
          console.log(`🚔 Joined officer room with unit: ${unitId}`);
        });

        socket.on('disconnect', () => {
          console.log('🔌 Socket disconnected');
          setIsSocketConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('🚨 Socket connection error:', error);
          setIsSocketConnected(false);
        });

        // Listen for location updates for assigned SOS
        socket.on('unit_location_update', (data: SOSLocationUpdate) => {
          console.log('🚔 Unit Location Update:', data);
          
          // Validate the received data
          if (!data || !data.sos_id || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
            console.error('❌ Invalid SOS location data received:', data);
            return;
          }

          // Store this SOS as assigned to the unit
          storeAssignedSOSFromUpdate(data);
          
          // Update the specific SOS location in the map
          setSOSLocations(prevLocations => {
            const newLocations = new Map(prevLocations);
            newLocations.set(data.sos_id, data);
            console.log(`✅ Updated SOS location for ID: ${data.sos_id}`, newLocations);
            return newLocations;
          });
          
          // If this is the first SOS or if no SOS is currently selected, select this one
          setSelectedSOS(prevSelected => {
            if (!prevSelected || sosLocations.size === 0) {
              return data.sos_id;
            }
            return prevSelected;
          });
          
          // Update map region to show the latest SOS location
          if (data.latitude && data.longitude) {
            const newRegion: Region = {
              latitude: data.latitude,
              longitude: data.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);
          }
        });

        // Listen for SOS removal (optional)
        socket.on('sos_resolved', (data: { sos_id: string }) => {
          console.log('🎯 SOS Resolved:', data);
          
          // Validate the received data
          if (!data || !data.sos_id || typeof data.sos_id !== 'string') {
            console.error('❌ Invalid SOS resolved data received:', data);
            return;
          }
          
          setSOSLocations(prevLocations => {
            const newLocations = new Map(prevLocations);
            const removed = newLocations.delete(data.sos_id);
            console.log(`${removed ? '✅' : '❌'} SOS ${data.sos_id} removal ${removed ? 'successful' : 'failed'}`);
            return newLocations;
          });
          
          // If the removed SOS was selected, clear the selection
          setSelectedSOS(prevSelected => {
            if (prevSelected === data.sos_id) {
              return null;
            }
            return prevSelected;
          });
        });

      } catch (error) {
        console.error('🚨 Socket initialization error:', error);
      }
    };

    initializeSocket();

    // Cleanup socket connection on unmount
    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [unitId]);

  // Continuously emit police unit location
  useEffect(() => {
    let locationInterval: NodeJS.Timeout | null = null;

    const emitUnitLocation = async () => {
      try {
        if (socketRef.current?.connected && location?.coords) {
          const unitLocationData = {
            "unit_id": unitId,
            "latitude": location.coords.latitude,
            "longitude": location.coords.longitude,
            "timestamp": new Date().toISOString(),
          };
          
          socketRef.current.emit('officer_location_update', unitLocationData);
          console.log('📡 Emitted unit location:', unitLocationData);
        } else {
          console.log('⚠️ Cannot emit location:', {
            socketConnected: socketRef.current?.connected,
            hasLocation: !!location?.coords,
            unitId
          });
        }
      } catch (error) {
        console.error('❌ Error emitting unit location:', error);
      }
    };

    // Only start emitting if we have both location and socket connection
    if (location?.coords && isSocketConnected && socketRef.current?.connected) {
      console.log('🔄 Starting location emission for unit:', unitId);
      
      // Emit immediately
      emitUnitLocation();
      
      // Set up interval to emit every 5 seconds
      locationInterval = setInterval(emitUnitLocation, 5000);
      console.log('✅ Location emission interval started');
    } else {
      console.log('⏸️ Location emission paused:', {
        hasLocation: !!location?.coords,
        isSocketConnected,
        socketActuallyConnected: socketRef.current?.connected
      });
    }

    // Cleanup interval on dependencies change or unmount
    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
        locationInterval = null;
        console.log('🛑 Cleared location emission interval');
      }
    };
  }, [location, isSocketConnected, unitId]);

  useEffect(() => {
    const getLocationWithTimeout = async () => {
      setIsLoading(true);
      
      // Set a timeout to avoid indefinite loading
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Location request timed out')), 10000);
      });
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        try {
          // Race between location fetch and timeout
          const currentLocation = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced
            }),
            timeoutPromise
          ]) as Location.LocationObject;
          
          setLocation(currentLocation);
          
          const newRegion: Region = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };
          
          setRegion(newRegion);
          
          // Use setTimeout to make sure the map has been rendered before animating
          setTimeout(() => {
            mapRef.current?.animateToRegion(newRegion, 1000);
            setIsLoading(false);
          }, 500);
          
        } catch (timeoutErr) {
          console.error("Location request timed out, using default location");
          // Keep using the default location
          setIsLoading(false);
        }
        
      } catch (err) {
        console.error("Error getting location:", err);
        setErrorMsg('Failed to get location');
        setIsLoading(false);
      }
    };
    
    getLocationWithTimeout();
  }, []);

  const refreshLocation = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg(null); // Clear any previous error message
    
    // Set a timeout to avoid indefinite loading
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Location refresh timed out')), 10000);
    });
    
    try {
      // Race between location fetch and timeout
      const currentLocation = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        }),
        timeoutPromise
      ]) as Location.LocationObject;
      
      console.log('🔄 Location refreshed:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        unitId
      });
      
      setLocation(currentLocation);
      // Note: Not redirecting map to current location on refresh - only update location state
      
    } catch (err) {
      console.error("Error refreshing location:", err);
      setErrorMsg('Failed to refresh location');
      // Keep using the current region
    } finally {
      setIsLoading(false);
    }
  };

  const fitAllMarkers = (): void => {
    const locations = Array.from(sosLocations.values());
    if (locations.length === 0) return;

    if (locations.length === 1) {
      // Single marker, center on it
      const location = locations[0];
      const newRegion: Region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      mapRef.current?.animateToRegion(newRegion, 1000);
    } else {
      // Multiple markers, fit all in view
      const coordinates = locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const getMarkerColor = (sosId: string): string => {
    // Safety check for undefined or null sosId
    if (!sosId || typeof sosId !== 'string') {
      console.warn('Invalid sosId provided to getMarkerColor:', sosId);
      return 'red'; // Default color for invalid IDs
    }
    
    // Generate consistent colors for different SOS IDs
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown'];
    const hash = sosId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const navigateToSOS = (sosId: string): void => {
    const sosLocation = sosLocations.get(sosId);
    if (sosLocation) {
      const newRegion: Region = {
        latitude: sosLocation.latitude,
        longitude: sosLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setSelectedSOS(sosId);
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = (): void => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleDrawer = (): void => {
    const toValue = isDrawerOpen ? minDrawerHeight : defaultOpenHeight;
    
    Animated.spring(drawerHeight, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    lastDrawerHeight.current = toValue;
    setIsDrawerOpen(!isDrawerOpen);
  };

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: drawerHeight } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const newHeight = Math.max(
          minDrawerHeight,
          Math.min(maxDrawerHeight, lastDrawerHeight.current - event.nativeEvent.translationY)
        );
        drawerHeight.setValue(newHeight);
      }
    }
  );

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      const currentHeight = lastDrawerHeight.current - translationY;
      
      let finalHeight: number;
      
      // Determine final height based on velocity and position
      if (velocityY > 500) {
        // Fast downward swipe - close
        finalHeight = minDrawerHeight;
      } else if (velocityY < -500) {
        // Fast upward swipe - open fully
        finalHeight = maxDrawerHeight;
      } else {
        // Slow drag - snap to nearest position
        const midPoint = (minDrawerHeight + maxDrawerHeight) / 2;
        if (currentHeight < midPoint) {
          finalHeight = minDrawerHeight;
        } else {
          finalHeight = Math.max(defaultOpenHeight, currentHeight);
        }
      }
      
      // Animate to final position
      Animated.spring(drawerHeight, {
        toValue: finalHeight,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
      
      lastDrawerHeight.current = finalHeight;
      setIsDrawerOpen(finalHeight > minDrawerHeight);
    }
  };

  const getSosDisplayName = (sosId: string, index: number): string => {
    return `SOS ${sosId}`;
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m ago`;
    }
    return `${diffMins}m ago`;
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
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
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Clean up socket connection before logout
                      if (socketRef.current) {
                        console.log('🧹 Disconnecting socket before logout');
                        socketRef.current.disconnect();
                        socketRef.current = null;
                      }
                      
                      // Use auth context logout - this will automatically trigger navigation
                      console.log('🚪 Logging out...');
                      await logout();
                      console.log('✅ Logout successful');
                    } catch (error) {
                      console.error('Logout error:', error);
                      // If logout fails, still try to clear state
                      await logout();
                    }
                  },
                },
              ]
            );
          }}>
                <Ionicons name="power" size={24} color={colors.darkGray} />
          </TouchableOpacity> 
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Alert Dashboard</Text>
            <View style={styles.socketStatus}>
              <View style={[styles.socketIndicator, { backgroundColor: isSocketConnected ? '#28A745' : '#FFA500' }]} />
              <Text style={styles.socketStatusText}>
                {isSocketConnected ? 'Connected' : 'Connecting...'}
              </Text>
            </View>
            {sosLocations.size > 0 && (
              <Text style={styles.sosCountText}>
                Active SOS: {sosLocations.size}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {sosLocations.size > 1 && (
              <TouchableOpacity
                onPress={fitAllMarkers}
                style={styles.fitMarkersButton}
              >
                <Ionicons name="scan-outline" size={20} color={colors.darkGray} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.mapContainerFull}>
          <View style={styles.searchContainer}>
            <TouchableOpacity 
              style={styles.searchBar}
              onPress= {toggleDropdown}
              disabled={sosLocations.size === 0}
            >
              <Ionicons name="search" size={20} color={colors.gray} />
              <Text style={styles.searchText}>
                {sosLocations.size > 0 ? 
                  selectedSOS ? (() => {
                    const sosArray = Array.from(sosLocations.values());
                    const selectedIndex = sosArray.findIndex(sos => sos.sos_id === selectedSOS);
                    return selectedIndex !== -1 ? getSosDisplayName(selectedSOS, selectedIndex) : 'Select SOS location';
                  })() : 'Select SOS location'
                  :   'No active SOS'
                  }
              </Text>
              <Ionicons 
                name={sosLocations.size > 0 ? (isDropdownOpen ? "chevron-up" : "chevron-down") : undefined} 
                size={20} 
                color={colors.gray} 
              />
            </TouchableOpacity>
            
            {isDropdownOpen && sosLocations.size > 0 && (
              <View style={styles.dropdown}>
                {sosLocations.size > 1 && (
                  <TouchableOpacity
                    style={[styles.dropdownItem, styles.showAllItem]}
                    onPress={() => {
                      fitAllMarkers();
                      setSelectedSOS(null);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <View style={styles.dropdownItemContent}>
                      <View style={styles.dropdownItemHeader}>
                        <Ionicons name="scan-outline" size={16} color={colors.darkGray} />
                        <Text style={styles.dropdownItemTitle}>
                          Show All SOS Locations
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                
                {Array.from(sosLocations.values()).map((sosLocation, index) => (
                  <TouchableOpacity
                    key={sosLocation.sos_id}
                    style={[
                      styles.dropdownItem,
                      selectedSOS === sosLocation.sos_id && styles.dropdownItemSelected
                    ]}
                    onPress={() => navigateToSOS(sosLocation.sos_id)}
                  >
                    <View style={styles.dropdownItemContent}>
                      <View style={styles.dropdownItemHeader}>
                        <View style={[styles.markerColorIndicator, { backgroundColor: getMarkerColor(sosLocation.sos_id) }]} />
                        <Text style={styles.dropdownItemTitle}>
                          {getSosDisplayName(sosLocation.sos_id, index)}
                        </Text>
                      </View>
                      <Text style={styles.dropdownItemLocation}>
                        {sosLocation.latitude.toFixed(6)}, {sosLocation.longitude.toFixed(6)}
                      </Text>
                      <Text style={styles.dropdownItemTime}>
                        {new Date(sosLocation.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {isDropdownOpen && sosLocations.size === 0 && (
              <View style={styles.dropdown}>
                <View style={styles.dropdownEmpty}>
                  <Text style={styles.dropdownEmptyText}>No active SOS alerts</Text>
                </View>
              </View>
            )}
          </View>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.darkGray} />
              <Text style={styles.loadingText}>Getting location...</Text>
            </View>
          )}
          
          {errorMsg && !isLoading && (
            <View style={styles.errorOverlay}>
              <Ionicons name="warning-outline" size={32} color={colors.darkGray} />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={refreshLocation}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <MapView
            ref={mapRef}
            style={styles.mapFull}
            showsUserLocation={true}
            zoomControlEnabled={true}
            initialRegion={region}
            onPress={() => setIsDropdownOpen(false)}
          >
            {Array.from(sosLocations.values())
              .filter(sosLocation => 
                sosLocation && 
                sosLocation.sos_id && 
                typeof sosLocation.latitude === 'number' && 
                typeof sosLocation.longitude === 'number'
              )
              .map((sosLocation, index) => (
                <Marker
                  key={sosLocation.sos_id}
                  coordinate={{
                    latitude: sosLocation.latitude,
                    longitude: sosLocation.longitude,
                  }}
                  title={getSosDisplayName(sosLocation.sos_id, index)}
                  description={`Emergency location - ${new Date(sosLocation.timestamp).toLocaleString()}`}
                  pinColor={getMarkerColor(sosLocation.sos_id)}
                />
              ))
            }
          </MapView>
        </View>

        {/* Bottom History Drawer */}
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
        >
          <Animated.View style={[styles.bottomDrawer, { height: drawerHeight }]}>
            <TouchableOpacity 
              style={styles.drawerHandle}
              onPress={toggleDrawer}
            >
              <View style={styles.drawerHandleBar} />
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerHeaderTitle}>Recent History</Text>
                <View style={styles.drawerHeaderRight}>
                  <Text style={styles.historyCount}>{recentHistory.length} resolved</Text>
                  <Ionicons 
                    name={isDrawerOpen ? "chevron-down" : "chevron-up"} 
                    size={20} 
                    color={colors.gray} 
                  />
                </View>
              </View>
            </TouchableOpacity>
            
            <Animated.View
              style={[
                styles.drawerContentContainer,
                {
                  opacity: drawerHeight.interpolate({
                    inputRange: [minDrawerHeight, minDrawerHeight + 50],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                }
              ]}
              pointerEvents={isDrawerOpen ? 'auto' : 'none'}
            >
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {recentHistory.length === 0 ? (
                  <View style={styles.emptyHistoryContainer}>
                    <Ionicons name="time-outline" size={48} color={colors.gray} />
                    <Text style={styles.emptyHistoryTitle}>No Recent History</Text>
                    <Text style={styles.emptyHistorySubtitle}>Resolved SOS cases will appear here</Text>
                  </View>
                ) : (
                  recentHistory.map((item) => (
                    <View key={item.sos_id} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <View style={styles.historyItemStatus}>
                          <Ionicons name="checkmark-circle" size={16} color="#28A745" />
                          <Text style={styles.historyItemTitle}>SOS {item.sos_id} Resolved</Text>
                        </View>
                        <Text style={styles.historyItemTime}>
                          {getTimeAgo(item.resolvedAt)}
                        </Text>
                      </View>
                      
                      <View style={styles.historyItemDetails}>
                        {item.latitude && item.longitude && (
                          <View style={styles.historyItemRow}>
                            <Ionicons name="location-outline" size={14} color={colors.gray} />
                            <Text style={styles.historyItemLocation}>
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                            </Text>
                          </View>
                        )}
                        
                        <View style={styles.historyItemRow}>
                          <Ionicons name="time-outline" size={14} color={colors.gray} />
                          <Text style={styles.historyItemResponseTime}>
                            Response: {item.responseTime}
                          </Text>
                        </View>
                        
                        <View style={styles.historyItemRow}>
                          <Ionicons name="shield-outline" size={14} color={colors.gray} />
                          <Text style={styles.historyItemUnit}>
                            Resolved by: {item.resolvedBy}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>
      </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between', // 25/06/25
    marginTop: spacing.lg,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  socketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.xs,
  },
  socketIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  socketStatusText: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
  sosCountText: {
    fontSize: 11,
    color: colors.darkGray,
    fontWeight: '600',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fitMarkersButton: {
    padding: spacing.xs,
  },
  mapContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  mapContainerFull: {
    flex: 1,
    position: 'relative',
  },
  mapContainerInner: {
    position: 'relative',
    height: 300,
    width: '100%',
    borderRadius: borderRadius.small,
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: borderRadius.small,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.darkGray,
    fontSize: 16,
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: borderRadius.small,
    padding: spacing.lg,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.darkGray,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.darkGray,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  searchContainer: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    zIndex: 5,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 300,
    marginTop: spacing.xs,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    minHeight: 70,
  },
  dropdownItemSelected: {
    backgroundColor: colors.lightGray,
  },
  showAllItem: {
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 2,
    borderBottomColor: colors.darkGray,
  },
  dropdownItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dropdownItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  markerColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  dropdownItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    flex: 1,
  },
  dropdownItemLocation: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  dropdownItemTime: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 16,
  },
  dropdownEmpty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: colors.gray,
    fontStyle: 'italic',
  },
  searchText: {
    color: colors.gray,
    fontSize: 16,
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  map: {
    height: 300,
    width: '100%',
    borderRadius: borderRadius.small,
  },
  mapFull: {
    flex: 1,
    width: '100%',
  },
  mapControls: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    gap: 2,
  },
  mapButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  drawerHandle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
  },
  drawerHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.lightGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
  },
  drawerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyCount: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
  drawerContentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  historyItem: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.small,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#28A745',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
  },
  historyItemTime: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
  historyItemDetails: {
    gap: spacing.xs,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyItemLocation: {
    fontSize: 12,
    color: colors.gray,
  },
  historyItemResponseTime: {
    fontSize: 12,
    color: colors.gray,
  },
  historyItemUnit: {
    fontSize: 12,
    color: colors.gray,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyHistorySubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
