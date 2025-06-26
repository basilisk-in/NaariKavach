import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import { EmergencyContact, emergencyContactsManager } from '../services/services';
import * as Contacts from 'expo-contacts';

type AddEmergencyContactScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddEmergencyContact'>;

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  avatar?: string;
}

interface Props {
  navigation: AddEmergencyContactScreenNavigationProp;
}

export default function AddEmergencyContactScreen({ navigation }: Props): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissionStatus, setPermissionStatus] = useState<Contacts.PermissionStatus | null>(null);

  // Colors for contact avatars
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#FF7675', '#74B9FF', '#00B894', '#FDCB6E'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load existing emergency contacts
      const existingContacts = await emergencyContactsManager.getEmergencyContacts();
      setEmergencyContacts(existingContacts);
      
      // Load device contacts
      await getContacts();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getContacts = async (): Promise<void> => {
    try {
      // Request permission to access contacts
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To add emergency contacts, we need access to your contacts. Please enable contacts permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Contacts.requestPermissionsAsync() }
          ]
        );
        return;
      }

      // Fetch contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Transform contacts data
      const transformedContacts: Contact[] = data
        .filter(contact => 
          contact.name && 
          contact.name.trim() !== '' && 
          contact.phoneNumbers && 
          contact.phoneNumbers.length > 0
        )
        .map((contact, index) => ({
          id: contact.id || `contact_${index}`,
          name: contact.name || 'Unknown',
          phoneNumbers: (contact.phoneNumbers?.map(phone => phone.number).filter((n): n is string => typeof n === 'string') || []),
          emails: (contact.emails?.map(email => email.email).filter((e): e is string => typeof e === 'string') || []),
          avatar: avatarColors[index % avatarColors.length],
        }));

      setContacts(transformedContacts);
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert(
        'Error',
        'Unable to load contacts. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    // Filter out contacts that are already emergency contacts
    !emergencyContacts.some(emergencyContact => 
      contact.phoneNumbers?.some(phone => phone === emergencyContact.phoneNumber)
    )
  );

  const handleAddContact = async (contact: Contact) => {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert('Error', 'This contact has no phone number');
      return;
    }

    try {
      const primaryPhone = contact.phoneNumbers[0];
      const primaryEmail = contact.emails && contact.emails.length > 0 ? contact.emails[0] : undefined;

      const newEmergencyContact: Omit<EmergencyContact, 'id' | 'addedAt'> = {
        name: contact.name,
        phoneNumber: primaryPhone,
        email: primaryEmail,
        avatar: contact.avatar,
      };

      await emergencyContactsManager.addEmergencyContact(newEmergencyContact);
      
      Alert.alert(
        'Contact Added',
        `${contact.name} has been added to your emergency contacts.`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
      
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add contact');
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove any non-digit characters for display
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    return phoneNumber;
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
          <Text style={styles.headerTitle}>Add Emergency Contact</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.darkGray} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : permissionStatus !== 'granted' ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="people-outline" size={64} color={colors.gray} />
            <Text style={styles.permissionTitle}>Contacts Permission Needed</Text>
            <Text style={styles.permissionText}>
              To add emergency contacts, we need access to your device contacts. 
              Please enable contacts permission in your device settings.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={getContacts}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
            {filteredContacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={colors.gray} />
                <Text style={styles.emptyText}>
                  {searchQuery.trim() === '' 
                    ? 'No contacts available or all contacts are already added as emergency contacts.'
                    : `No contacts found matching "${searchQuery}"`
                  }
                </Text>
              </View>
            ) : (
              filteredContacts.map((contact, index) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactItem}
                  onPress={() => handleAddContact(contact)}
                >
                  <View style={[styles.avatar, { backgroundColor: contact.avatar }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(contact.name)}
                    </Text>
                  </View>
                  
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                      <Text style={styles.contactPhone}>
                        {formatPhoneNumber(contact.phoneNumbers[0])}
                      </Text>
                    )}
                    {contact.emails && contact.emails.length > 0 && (
                      <Text style={styles.contactEmail}>
                        {contact.emails[0]}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.addButton}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.darkGray} />
                  </View>
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
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.darkGray,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.medium,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
