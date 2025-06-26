import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type PrivacySecurityScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PrivacySecurity'>;

interface Props {
  navigation: PrivacySecurityScreenNavigationProp;
}

export default function PrivacySecurityScreen({ navigation }: Props): React.JSX.Element {
  const [settings, setSettings] = useState({
    biometricLock: false,
    appLockEnabled: false,
    dataEncryption: true,
    shareUsageData: false,
    locationDataRetention: true,
    thirdPartySharing: false,
    crashReporting: true,
  });

  const handleSettingToggle = (key: keyof typeof settings) => {
    if (key === 'dataEncryption' && settings[key]) {
      Alert.alert(
        'Security Warning',
        'Disabling data encryption may compromise your privacy and security. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disable', 
            style: 'destructive',
            onPress: () => setSettings(prev => ({ ...prev, [key]: !prev[key] }))
          }
        ]
      );
    } else {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'You will be redirected to change your password.',
      [{ text: 'OK' }]
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'Your data will be exported and sent to your registered email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => Alert.alert('Success', 'Data export initiated.') }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => Alert.alert('Account Deletion', 'Account deletion request submitted.') 
        }
      ]
    );
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onToggle, 
    icon,
    isSecure = false
  }: { 
    title: string; 
    description: string; 
    value: boolean; 
    onToggle: () => void; 
    icon: keyof typeof Ionicons.glyphMap;
    isSecure?: boolean;
  }) => (
    <View style={styles.settingItem}>
      <View style={[styles.settingIcon, isSecure && styles.secureIcon]}>
        <Ionicons name={icon} size={24} color={isSecure ? colors.white : colors.darkGray} />
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

  const ActionItem = ({ 
    title, 
    description, 
    onPress, 
    icon,
    isDangerous = false
  }: { 
    title: string; 
    description: string; 
    onPress: () => void; 
    icon: keyof typeof Ionicons.glyphMap;
    isDangerous?: boolean;
  }) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={[styles.settingIcon, isDangerous && styles.dangerIcon]}>
        <Ionicons name={icon} size={24} color={isDangerous ? colors.white : colors.darkGray} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDangerous && styles.dangerText]}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Security</Text>
            
            <SettingItem
              title="Biometric Lock"
              description="Use fingerprint or face recognition to unlock the app"
              value={settings.biometricLock}
              onToggle={() => handleSettingToggle('biometricLock')}
              icon="finger-print"
              isSecure={true}
            />
            
            <SettingItem
              title="App Lock"
              description="Require PIN to access the app"
              value={settings.appLockEnabled}
              onToggle={() => handleSettingToggle('appLockEnabled')}
              icon="lock-closed"
              isSecure={true}
            />
            
            <SettingItem
              title="Data Encryption"
              description="Encrypt all stored data on your device"
              value={settings.dataEncryption}
              onToggle={() => handleSettingToggle('dataEncryption')}
              icon="shield-checkmark"
              isSecure={true}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Privacy</Text>
            
            <SettingItem
              title="Share Usage Data"
              description="Help improve the app by sharing anonymous usage statistics"
              value={settings.shareUsageData}
              onToggle={() => handleSettingToggle('shareUsageData')}
              icon="analytics"
            />
            
            <SettingItem
              title="Location Data Retention"
              description="Store location history for emergency purposes"
              value={settings.locationDataRetention}
              onToggle={() => handleSettingToggle('locationDataRetention')}
              icon="location"
            />
            
            <SettingItem
              title="Third-party Sharing"
              description="Allow sharing data with trusted safety partners"
              value={settings.thirdPartySharing}
              onToggle={() => handleSettingToggle('thirdPartySharing')}
              icon="share"
            />
            
            <SettingItem
              title="Crash Reporting"
              description="Send crash reports to help fix bugs"
              value={settings.crashReporting}
              onToggle={() => handleSettingToggle('crashReporting')}
              icon="bug"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Management</Text>
            
            <ActionItem
              title="Change Password"
              description="Update your account password"
              onPress={handleChangePassword}
              icon="key"
            />
            
            <ActionItem
              title="Export My Data"
              description="Download a copy of your personal data"
              onPress={handleDataExport}
              icon="download"
            />
            
            <ActionItem
              title="Delete Account"
              description="Permanently delete your account and all data"
              onPress={handleDeleteAccount}
              icon="trash"
              isDangerous={true}
            />
          </View>
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
  actionItem: {
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
  secureIcon: {
    backgroundColor: '#4CAF50',
  },
  dangerIcon: {
    backgroundColor: '#FF4444',
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
  dangerText: {
    color: '#FF4444',
  },
  settingDescription: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
});
