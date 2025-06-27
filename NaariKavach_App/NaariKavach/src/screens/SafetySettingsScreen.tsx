import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import { useAuth } from '../contexts/AuthContext';
import { SafetySettingsStorage, SafetySettings } from '../services/safetySettingsStorage';

type SafetySettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SafetySettings'>;

interface Props {
  navigation: SafetySettingsScreenNavigationProp;
}

export default function SafetySettingsScreen({ navigation }: Props): React.JSX.Element {
  const [settings, setSettings] = useState({
    autoLocationSharing: true,
    emergencyContactsAlert: true,
    backgroundLocationTracking: false,
    sosShakeGesture: true,
    autoCallPolice: false,
    locationHistoryStorage: true,
    anonymousReporting: false,
  });

  const handleSettingToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = () => {
    Alert.alert(
      'Settings Saved',
      'Your safety settings have been updated successfully.',
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onToggle, 
    icon 
  }: { 
    title: string; 
    description: string; 
    value: boolean; 
    onToggle: () => void; 
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color={colors.darkGray} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.lightGray, true: colors.black }}
        thumbColor={colors.white}
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
          <Text style={styles.headerTitle}>Safety Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Response</Text>
            
            <SettingItem
              title="Auto Location Sharing"
              description="Automatically share location when emergency alert is triggered"
              value={settings.autoLocationSharing}
              onToggle={() => handleSettingToggle('autoLocationSharing')}
              icon="location"
            />
            
            <SettingItem
              title="Emergency Contacts Alert"
              description="Notify emergency contacts immediately during emergencies"
              value={settings.emergencyContactsAlert}
              onToggle={() => handleSettingToggle('emergencyContactsAlert')}
              icon="people"
            />
            
            <SettingItem
              title="Auto Call Police"
              description="Automatically call police when SOS is triggered"
              value={settings.autoCallPolice}
              onToggle={() => handleSettingToggle('autoCallPolice')}
              icon="call"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location & Tracking</Text>
            
            <SettingItem
              title="Background Location Tracking"
              description="Allow location tracking when app is in background"
              value={settings.backgroundLocationTracking}
              onToggle={() => handleSettingToggle('backgroundLocationTracking')}
              icon="navigate"
            />
            
            <SettingItem
              title="Location History Storage"
              description="Store location history for safety analysis"
              value={settings.locationHistoryStorage}
              onToggle={() => handleSettingToggle('locationHistoryStorage')}
              icon="time"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gesture Controls</Text>
            
            <SettingItem
              title="SOS Shake Gesture"
              description="Trigger SOS by shaking your phone vigorously"
              value={settings.sosShakeGesture}
              onToggle={() => handleSettingToggle('sosShakeGesture')}
              icon="phone-portrait"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            
            <SettingItem
              title="Anonymous Reporting"
              description="Report incidents anonymously to help improve safety"
              value={settings.anonymousReporting}
              onToggle={() => handleSettingToggle('anonymousReporting')}
              icon="shield"
            />
          </View>

          <TouchableOpacity 
            style={[commonStyles.button, styles.saveButton]} 
            onPress={handleSaveSettings}
          >
            <Text style={commonStyles.buttonText}>Save Settings</Text>
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
