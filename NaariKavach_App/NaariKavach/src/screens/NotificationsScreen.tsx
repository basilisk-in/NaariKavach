import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type NotificationsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Notifications'>;

interface Props {
  navigation: NotificationsScreenNavigationProp;
}

export default function NotificationsScreen({ navigation }: Props): React.JSX.Element {
  const [notifications, setNotifications] = useState({
    emergencyAlerts: true,
    safetyReminders: true,
    locationUpdates: false,
    systemNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: false,
    weeklyReports: true,
  });

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifications = () => {
    Alert.alert(
      'Settings Saved',
      'Your notification preferences have been updated successfully.',
      [{ text: 'OK' }]
    );
  };

  const NotificationItem = ({ 
    title, 
    description, 
    value, 
    onToggle, 
    icon,
    important = false
  }: { 
    title: string; 
    description: string; 
    value: boolean; 
    onToggle: () => void; 
    icon: keyof typeof Ionicons.glyphMap;
    important?: boolean;
  }) => (
    <View style={styles.notificationItem}>
      <View style={[styles.notificationIcon, important && styles.importantIcon]}>
        <Ionicons name={icon} size={24} color={important ? colors.white : colors.darkGray} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text style={styles.notificationTitle}>{title}</Text>
          {important && (
            <View style={styles.importantBadge}>
              <Text style={styles.importantText}>Important</Text>
            </View>
          )}
        </View>
        <Text style={styles.notificationDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.lightGray, true: colors.black }}
        thumbColor={colors.white}
        disabled={important} // Important notifications cannot be disabled
      />
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Notifications</Text>
            
            <NotificationItem
              title="Emergency Alerts"
              description="Critical safety alerts and emergency notifications"
              value={notifications.emergencyAlerts}
              onToggle={() => handleNotificationToggle('emergencyAlerts')}
              icon="alert-circle"
              important={true}
            />
            
            <NotificationItem
              title="Safety Reminders"
              description="Periodic reminders about safety features and tips"
              value={notifications.safetyReminders}
              onToggle={() => handleNotificationToggle('safetyReminders')}
              icon="shield-checkmark"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location & Updates</Text>
            
            <NotificationItem
              title="Location Updates"
              description="Notifications when location is shared or tracked"
              value={notifications.locationUpdates}
              onToggle={() => handleNotificationToggle('locationUpdates')}
              icon="location"
            />
            
            <NotificationItem
              title="System Notifications"
              description="App updates, maintenance, and system messages"
              value={notifications.systemNotifications}
              onToggle={() => handleNotificationToggle('systemNotifications')}
              icon="settings"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Style</Text>
            
            <NotificationItem
              title="Sound Enabled"
              description="Play notification sounds for alerts"
              value={notifications.soundEnabled}
              onToggle={() => handleNotificationToggle('soundEnabled')}
              icon="volume-high"
            />
            
            <NotificationItem
              title="Vibration Enabled"
              description="Use vibration for important notifications"
              value={notifications.vibrationEnabled}
              onToggle={() => handleNotificationToggle('vibrationEnabled')}
              icon="phone-portrait"
            />
            
            <NotificationItem
              title="Quiet Hours"
              description="Reduce notifications during night hours (10 PM - 6 AM)"
              value={notifications.quietHours}
              onToggle={() => handleNotificationToggle('quietHours')}
              icon="moon"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reports & Insights</Text>
            
            <NotificationItem
              title="Weekly Safety Reports"
              description="Receive weekly summaries of your safety activities"
              value={notifications.weeklyReports}
              onToggle={() => handleNotificationToggle('weeklyReports')}
              icon="bar-chart"
            />
          </View>

          <TouchableOpacity 
            style={[commonStyles.button, styles.saveButton]} 
            onPress={handleSaveNotifications}
          >
            <Text style={commonStyles.buttonText}>Save Preferences</Text>
          </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  importantIcon: {
    backgroundColor: '#FF4444',
  },
  notificationContent: {
    flex: 1,
    marginRight: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    flex: 1,
  },
  importantBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.sm,
  },
  importantText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  notificationDescription: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
