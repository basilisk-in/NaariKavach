import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type AlertDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AlertDetails'>;
type AlertDetailsScreenRouteProp = RouteProp<RootStackParamList, 'AlertDetails'>;

interface AlertData {
  camera: string;
  location: string;
  timestamp: string;
}

interface Props {
  navigation: AlertDetailsScreenNavigationProp;
  route: AlertDetailsScreenRouteProp;
}

export default function AlertDetailsScreen({ navigation, route }: Props): React.JSX.Element {
  const alert: AlertData = route?.params?.alert || {
    camera: 'Camera-001',
    location: '34.0522° N, 118.2437° W',
    timestamp: '2024-04-20 14:30:00',
  };

  const handleAcknowledge = (): void => {
    Alert.alert('Success', 'Alert acknowledged');
  };

  const handleDispatch = (): void => {
    Alert.alert('Success', 'Unit dispatched');
  };

  const handleViewSnapshot = (): void => {
    Alert.alert('Info', 'Camera snapshot opened');
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alert Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Timestamp</Text>
            <Text style={styles.detailText}>{alert.timestamp}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.detailText}>{alert.location}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Camera ID</Text>
            <Text style={styles.detailText}>{alert.camera}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acknowledgeButton]}
                onPress={handleAcknowledge}
              >
                <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.dispatchButton]}
                onPress={handleDispatch}
              >
                <Text style={styles.actionButtonText}>Dispatch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.snapshotButton]}
                onPress={handleViewSnapshot}
              >
                <Text style={styles.actionButtonText}>View Camera Snapshot</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  content: {
    paddingHorizontal: spacing.lg,
  },
  detailSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 16,
    color: colors.darkGray,
    paddingVertical: spacing.sm,
  },
  actionButtons: {
    gap: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.small,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: colors.black,
  },
  acknowledgeButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  dispatchButton: {
    backgroundColor: colors.lightGray,
  },
  snapshotButton: {
    backgroundColor: colors.lightGray,
  },
  actionButtonText: {
    color: colors.darkGray,
    fontSize: 14,
    fontWeight: '700',
  },
});
