import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { PoliceTabParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type PoliceAlertsScreenNavigationProp = BottomTabNavigationProp<PoliceTabParamList, 'Alerts'>;
type PoliceAlertsScreenRouteProp = RouteProp<PoliceTabParamList, 'Alerts'>;

interface AlertData {
  id: string;
  camera: string;
  location: string;
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'dispatched';
}

interface Props {
  navigation: PoliceAlertsScreenNavigationProp;
  route: PoliceAlertsScreenRouteProp;
}

export default function PoliceAlertsScreen({ navigation, route }: Props): React.JSX.Element {
  // Mock alert data for demonstration
  const alerts: AlertData[] = [
    {
      id: '1',
      camera: 'Camera-001',
      location: '34.0522° N, 118.2437° W',
      timestamp: '2024-04-20 14:30:00',
      status: 'pending',
    },
    {
      id: '2',
      camera: 'Camera-002',
      location: '34.0523° N, 118.2438° W',
      timestamp: '2024-04-20 14:25:00',
      status: 'acknowledged',
    },
    {
      id: '3',
      camera: 'Camera-003',
      location: '34.0524° N, 118.2439° W',
      timestamp: '2024-04-20 14:20:00',
      status: 'dispatched',
    },
  ];

  const handleAlertPress = (alert: AlertData): void => {
    Alert.alert(
      'Alert Details',
      `Camera: ${alert.camera}\nLocation: ${alert.location}\nTime: ${alert.timestamp}\nStatus: ${alert.status}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Acknowledge', onPress: () => handleAcknowledge(alert.id) },
        { text: 'Dispatch', onPress: () => handleDispatch(alert.id) },
      ]
    );
  };

  const handleAcknowledge = (alertId: string): void => {
    Alert.alert('Success', `Alert ${alertId} acknowledged`);
  };

  const handleDispatch = (alertId: string): void => {
    Alert.alert('Success', `Unit dispatched for alert ${alertId}`);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'acknowledged':
        return '#17A2B8';
      case 'dispatched':
        return '#28A745';
      default:
        return colors.darkGray;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'pending':
        return 'alert-circle';
      case 'acknowledged':
        return 'checkmark-circle';
      case 'dispatched':
        return 'car';
      default:
        return 'alert-circle-outline';
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
            </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Alerts</Text>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.darkGray} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          {alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => handleAlertPress(alert)}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertInfo}>
                  <Ionicons
                    name={getStatusIcon(alert.status)}
                    size={24}
                    color={getStatusColor(alert.status)}
                  />
                  <View style={styles.alertTextContainer}>
                    <Text style={styles.alertCamera}>{alert.camera}</Text>
                    <Text style={styles.alertTime}>{alert.timestamp}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) }]}>
                  <Text style={styles.statusText}>{alert.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.alertLocation}>{alert.location}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  refreshButton: {
    padding: spacing.sm,
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
  alertCamera: {
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
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
