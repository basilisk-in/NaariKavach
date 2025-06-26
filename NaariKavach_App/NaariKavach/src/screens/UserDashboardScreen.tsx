import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { UserTabParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type UserDashboardScreenNavigationProp = BottomTabNavigationProp<UserTabParamList, 'Home'>;

interface Props {
  navigation: UserDashboardScreenNavigationProp;
}

export default function UserDashboardScreen({ navigation }: Props): React.JSX.Element {
  const [isSafe, setIsSafe] = useState(true);

  const handleEmergencyPress = (): void => {
    setIsSafe(false);
    Alert.alert('Emergency Alert', 'Emergency alert sent! Your status has been updated to unsafe.');
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
          </View><TouchableOpacity 
            style={styles.statusCard}
            onPress={() => navigation.navigate('Safety')}
          >
            <View style={styles.statusIcon}>
              <Ionicons name="location" size={24} color={colors.darkGray} />
            </View>
            <Text style={styles.statusText}>Share Location with Family/Friends</Text>
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
  statusText: {
    fontSize: 16,
    color: colors.darkGray,
    flex: 1,
  },
});
