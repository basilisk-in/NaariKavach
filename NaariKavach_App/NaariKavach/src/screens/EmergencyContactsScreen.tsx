import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import { EmergencyContact, emergencyContactsManager } from '../services/services';
import { useFocusEffect } from '@react-navigation/native';

type EmergencyContactsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EmergencyContacts'>;

interface Props {
  navigation: EmergencyContactsScreenNavigationProp;
}

export default function EmergencyContactsScreen({ navigation }: Props): React.JSX.Element {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Colors for contact avatars
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#FF7675', '#74B9FF', '#00B894', '#FDCB6E'
  ];

  const loadEmergencyContacts = async () => {
    try {
      setIsLoading(true);
      const contacts = await emergencyContactsManager.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts');
    } finally {
      setIsLoading(false);
    }
  };

  // Reload contacts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEmergencyContacts();
    }, [])
  );

  const handleRemoveContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.name} from your emergency contacts?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedContacts = await emergencyContactsManager.removeEmergencyContact(contact.id);
              setEmergencyContacts(updatedContacts);
            } catch (error) {
              console.error('Error removing contact:', error);
              Alert.alert('Error', 'Failed to remove contact');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (contactId: string): string => {
    const index = parseInt(contactId) % avatarColors.length;
    return avatarColors[index];
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddEmergencyContact')}
          >
            <Ionicons name="add" size={24} color={colors.darkGray} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.darkGray} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {emergencyContacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={colors.gray} />
                <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
                <Text style={styles.emptyText}>
                  Add emergency contacts to quickly share your location during unsafe situations.
                </Text>
                <TouchableOpacity
                  style={styles.addFirstContactButton}
                  onPress={() => navigation.navigate('AddEmergencyContact')}
                >
                  <Text style={styles.addFirstContactButtonText}>Add Your First Contact</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.infoText}>
                  These contacts will receive your location during emergency situations.
                </Text>
                
                <View style={styles.contactsList}>
                  {emergencyContacts.map((contact) => (
                    <View key={contact.id} style={styles.contactItem}>
                      <View style={[styles.avatar, { backgroundColor: getAvatarColor(contact.id) }]}>
                        <Text style={styles.avatarText}>
                          {getInitials(contact.name)}
                        </Text>
                      </View>
                      
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                        {contact.email && (
                          <Text style={styles.contactEmail}>{contact.email}</Text>
                        )}
                      </View>
                      
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveContact(contact)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={styles.addMoreContainer}>
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={() => navigation.navigate('AddEmergencyContact')}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={colors.darkGray} />
                    <Text style={styles.addMoreButtonText}>Add More Contacts</Text>
                  </TouchableOpacity>
                </View>
              </>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    marginTop: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  addFirstContactButton: {
    backgroundColor: colors.darkGray,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.medium,
  },
  addFirstContactButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: colors.gray,
    paddingVertical: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactsList: {
    gap: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  contactPhone: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  contactEmail: {
    fontSize: 12,
    color: colors.gray,
  },
  removeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.medium,
    gap: spacing.sm,
  },
  addMoreButtonText: {
    fontSize: 16,
    color: colors.darkGray,
    fontWeight: '500',
  },
});
