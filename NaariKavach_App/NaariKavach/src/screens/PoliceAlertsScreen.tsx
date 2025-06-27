import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { PoliceTabParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sosApi } from '../services/services';

type PoliceAlertsScreenNavigationProp = BottomTabNavigationProp<PoliceTabParamList, 'Alerts'>;
type PoliceAlertsScreenRouteProp = RouteProp<PoliceTabParamList, 'Alerts'>;

interface SOSAlert {
  sos_id: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  status: 'active' | 'pending' | 'assigned';
  priority?: 'high' | 'medium' | 'low';
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
  navigation: PoliceAlertsScreenNavigationProp;
  route: PoliceAlertsScreenRouteProp;
}

export default function PoliceAlertsScreen({ navigation, route }: Props): React.JSX.Element {
  const { unitId } = route.params || { unitId: 'Unknown' };
  
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Mock SOS alert data - replace with actual API call
  const mockSOSAlerts: SOSAlert[] = [
    {
      sos_id: 'SOS-001',
      latitude: 28.6139,
      longitude: 77.2090,
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      status: 'active',
      priority: 'high',
    },
    {
      sos_id: 'SOS-002',
      latitude: 28.7041,
      longitude: 77.1025,
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      status: 'assigned',
      priority: 'medium',
    },
    {
      sos_id: 'SOS-003',
      latitude: 28.5355,
      longitude: 77.3910,
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
      status: 'pending',
      priority: 'high',
    },
  ];

  useEffect(() => {
    fetchSOSAlerts();
  }, []);

  const fetchSOSAlerts = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await sosApi.getActiveSOS();
      // if (response.success && response.data) {
      //   setSOSAlerts(response.data);
      // }
      
      // For now, use mock data with a delay to simulate API call
      setTimeout(() => {
        setSOSAlerts(mockSOSAlerts);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching SOS alerts:', error);
      Alert.alert('Error', 'Failed to fetch SOS alerts');
      setIsLoading(false);
    }
  };

  const refreshAlerts = async (): Promise<void> => {
    setRefreshing(true);
    await fetchSOSAlerts();
    setRefreshing(false);
  };

  const handleSOSPress = (alert: SOSAlert): void => {
    const timeAgo = getTimeAgo(alert.timestamp);
    
    Alert.alert(
      `SOS Alert - ${alert.sos_id}`,
      `Time: ${timeAgo}\nStatus: ${alert.status.toUpperCase()}\nPriority: ${alert.priority?.toUpperCase() || 'NORMAL'}\n${alert.latitude && alert.longitude ? `Location: ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : 'Location: Not available'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => handleViewDetails(alert) },
        { 
          text: 'Resolve', 
          style: 'destructive',
          onPress: () => handleResolveSOS(alert)
        },
      ]
    );
  };

  const handleViewDetails = (alert: SOSAlert): void => {
    // TODO: Navigate to detailed SOS view or show more information
    Alert.alert(
      'SOS Details',
      `SOS ID: ${alert.sos_id}\nTimestamp: ${new Date(alert.timestamp).toLocaleString()}\nStatus: ${alert.status}\nPriority: ${alert.priority || 'Normal'}\n${alert.latitude && alert.longitude ? `Coordinates: ${alert.latitude}, ${alert.longitude}` : 'Location data not available'}`
    );
  };

  const handleResolveSOS = async (alert: SOSAlert): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call the resolve SOS service
      const response = await sosApi.resolveSOS(parseInt(alert.sos_id.replace('SOS-', '')));
      
      if (response.success) {
        // Create resolved SOS object for storage
        const resolvedSOS: ResolvedSOS = {
          sos_id: alert.sos_id,
          resolvedAt: new Date().toISOString(),
          resolvedBy: unitId,
          latitude: alert.latitude,
          longitude: alert.longitude,
          responseTime: calculateResponseTime(alert.timestamp),
        };
        
        // Store in AsyncStorage for recent history
        await storeResolvedSOS(resolvedSOS);
        
        // Remove from current alerts
        setSOSAlerts(prev => prev.filter(item => item.sos_id !== alert.sos_id));
        
        Alert.alert('Success', `SOS ${alert.sos_id} has been resolved by Unit ${unitId}`);
      } else {
        Alert.alert('Error', response.error || 'Failed to resolve SOS');
      }
    } catch (error) {
      console.error('Error resolving SOS:', error);
      Alert.alert('Error', 'Failed to resolve SOS. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const storeResolvedSOS = async (resolvedSOS: ResolvedSOS): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem('resolved_sos');
      const existingResolvedSOS: ResolvedSOS[] = existingData ? JSON.parse(existingData) : [];
      
      // Add new resolved SOS to the beginning of the array
      const updatedResolvedSOS = [resolvedSOS, ...existingResolvedSOS.slice(0, 19)]; // Keep only last 20
      
      await AsyncStorage.setItem('resolved_sos', JSON.stringify(updatedResolvedSOS));
    } catch (error) {
      console.error('Error storing resolved SOS:', error);
    }
  };

  const calculateResponseTime = (timestamp: string): string => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} min`;
    }
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m ago`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return '#FF4444';
      case 'assigned':
        return '#FFA500';
      case 'pending':
        return '#17A2B8';
      default:
        return colors.darkGray;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'active':
        return 'alert-circle';
      case 'assigned':
        return 'car';
      case 'pending':
        return 'time-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FFA500';
      case 'low':
        return '#28A745';
      default:
        return colors.gray;
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Active SOS Alerts</Text>
            <Text style={styles.unitIdText}>Unit: {unitId}</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshAlerts} disabled={refreshing}>
            <Ionicons 
              name="refresh" 
              size={24} 
              color={refreshing ? colors.gray : colors.darkGray} 
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.darkGray} />
            <Text style={styles.loadingText}>Loading SOS alerts...</Text>
          </View>
        ) : (
          <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
            {sosAlerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={64} color={colors.gray} />
                <Text style={styles.emptyTitle}>No Active SOS Alerts</Text>
                <Text style={styles.emptySubtitle}>All clear! No emergency alerts at this time.</Text>
              </View>
            ) : (
              sosAlerts.map((alert) => (
                <TouchableOpacity
                  key={alert.sos_id}
                  style={styles.alertCard}
                  onPress={() => handleSOSPress(alert)}
                >
                  <View style={styles.alertHeader}>
                    <View style={styles.alertInfo}>
                      <Ionicons
                        name={getStatusIcon(alert.status)}
                        size={24}
                        color={getStatusColor(alert.status)}
                      />
                      <View style={styles.alertTextContainer}>
                        <Text style={styles.alertId}>{alert.sos_id}</Text>
                        <Text style={styles.alertTime}>{getTimeAgo(alert.timestamp)}</Text>
                      </View>
                    </View>
                    <View style={styles.badgeContainer}>
                      {alert.priority && (
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(alert.priority) }]}>
                          <Text style={styles.priorityText}>{alert.priority.toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) }]}>
                        <Text style={styles.statusText}>{alert.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  {alert.latitude && alert.longitude && (
                    <Text style={styles.alertLocation}>
                      📍 {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  unitIdText: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  alertsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  alertCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertTextContainer: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  alertId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
  },
  alertTime: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  alertLocation: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    minWidth: 50,
    alignItems: 'center',
  },
  priorityText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
