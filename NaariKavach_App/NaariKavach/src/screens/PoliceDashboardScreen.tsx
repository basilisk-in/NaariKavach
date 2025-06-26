import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PoliceTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';

type PoliceDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<PoliceTabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

interface Alert {
  id: number;
  camera: string;
  location: string;
  time: string;
}

interface Props {
  navigation: PoliceDashboardNavigationProp;
}

const recentAlerts: Alert[] = [
  {
    id: 1,
    camera: 'Camera 1',
    location: '123 Main St',
    time: '10:30 AM',
  },
  {
    id: 2,
    camera: 'Camera 2',
    location: '456 Oak Ave',
    time: '10:15 AM',
  },
  {
    id: 3,
    camera: 'Camera 3',
    location: '789 Pine Ln',
    time: '9:45 AM',
  },
];

export default function PoliceDashboardScreen({ navigation }: Props): React.JSX.Element {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Default region (will be used if location permission is denied or location cannot be fetched)
  const defaultRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };
  
  const [region, setRegion] = useState<Region>(defaultRegion);
  const mapRef = useRef<MapView | null>(null);

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

  const handleAlertPress = (alert: Alert): void => {
    navigation.navigate('AlertDetails', { alert });
  };
  
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
      
      setLocation(currentLocation);
      
      const newRegion: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (err) {
      console.error("Error refreshing location:", err);
      setErrorMsg('Failed to refresh location');
      // Keep using the current region
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity> 
          <Text style={styles.headerTitle}>Alert Dashboard</Text>
          <TouchableOpacity
              onPress={refreshLocation}
          >
            <Ionicons name="refresh" size={24} color={colors.darkGray} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.gray} />
            <Text style={styles.searchText}>Search for location</Text>
          </View>
          
          <View style={styles.mapContainerInner}>
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
              style={styles.map}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              zoomControlEnabled={true}
              initialRegion={region}
            />
            
            
          </View>
        </View>

        <View style={styles.alertsSection}>
          <View style={styles.indicatorBar} />
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          
          {recentAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => handleAlertPress(alert)}
            >
              <View style={styles.alertInfo}>
                <View style={styles.alertIcon}>
                  <Ionicons name="videocam" size={24} color={colors.darkGray} />
                </View>
                <View style={styles.alertDetails}>
                  <Text style={styles.alertCamera}>{alert.camera}</Text>
                  <Text style={styles.alertLocation}>{alert.location}</Text>
                </View>
              </View>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </TouchableOpacity>
          ))}
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
  mapContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: spacing.sm,
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
  alertsSection: {
    flex: 1,
    backgroundColor: colors.white,
  },
  indicatorBar: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  alertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  alertIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDetails: {
    flex: 1,
  },
  alertCamera: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
  },
  alertLocation: {
    fontSize: 14,
    color: colors.gray,
  },
  alertTime: {
    fontSize: 14,
    color: colors.gray,
  },
});
