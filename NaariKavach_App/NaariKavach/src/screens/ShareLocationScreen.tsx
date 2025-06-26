import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { UserTabParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';

type ShareLocationScreenNavigationProp = BottomTabNavigationProp<UserTabParamList, 'Safety'>;

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  avatar?: string;
}

interface Props {
  navigation: ShareLocationScreenNavigationProp;
}

export default function ShareLocationScreen({ navigation }: Props): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissionStatus, setPermissionStatus] = useState<Contacts.PermissionStatus | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);

  // Colors for contact avatars
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#FF7675', '#74B9FF', '#00B894', '#FDCB6E'
  ];

  useEffect(() => {
    getContacts();
  }, []);

  const getContacts = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Request permission to access contacts
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To share your location with contacts, we need access to your contacts. Please enable contacts permission in your device settings.',
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
        .filter(contact => contact.name && contact.name.trim() !== '') // Filter out contacts without names
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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (contactId: string): void => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      setIsGettingLocation(true);
      
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'To share your location, we need access to your current location.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation(location);
      return location;
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again.',
        [{ text: 'OK' }]
      );
      return null;
    } finally {
      setIsGettingLocation(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number starts with country code, use as is
    // If it's a local number, you might need to add your country code
    if (cleaned.length === 10) {
      // Assuming Indian numbers, add +91
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add country code
      cleaned = '91' + cleaned.substring(1);
    }
    
    return cleaned;
  };

  const shareLocationViaWhatsApp = async (contact: Contact, location: Location.LocationObject): Promise<boolean> => {
    try {
      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
        return false;
      }

      const phoneNumber = formatPhoneNumber(contact.phoneNumbers[0]);
      const { latitude, longitude } = location.coords;
      
      // Create location message
      const locationMessage = `Emergency Alert from NaariKavach \n\nI'm sharing my current location with you for safety purposes, I hope that you can monitor my journey!.\n\nLocation: https://maps.google.com/maps?q=${latitude},${longitude}\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nPlease check on me if you don't hear from me soon.\n\n- Sent via NaariKavach. Your Safety, Our Priority~`;
      
      // Create WhatsApp URL
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(locationMessage)}`;
      
      // Check if WhatsApp can be opened
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        // Fallback to web WhatsApp
        const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(locationMessage)}`;
        await Linking.openURL(webWhatsappUrl);
        return true;
      }
      
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      return false;
    }
  };

  const handleShareLocation = async (): Promise<void> => {
    const selectedContactsData = contacts.filter(contact => 
      selectedContacts.includes(contact.id)
    );
    
    // Get current location first
    const location = currentLocation || await getCurrentLocation();
    
    if (!location) {
      Alert.alert(
        'Location Required',
        'Unable to get your current location. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Share Location',
      `Share your current location via WhatsApp with ${selectedContactsData.length} selected contact${selectedContactsData.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share via WhatsApp',
          onPress: async () => {
            let successCount = 0;
            let failureCount = 0;
            
            // Show loading alert
            Alert.alert(
              'Sharing Location',
              'Please wait while we share your location...',
              [],
              { cancelable: false }
            );
            
            for (const contact of selectedContactsData) {
              const success = await shareLocationViaWhatsApp(contact, location);
              if (success) {
                successCount++;
              } else {
                failureCount++;
              }
              
              // Small delay between messages to avoid overwhelming WhatsApp
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Show result
            setTimeout(() => {
              if (successCount === selectedContactsData.length) {
                Alert.alert(
                  'Location Shared Successfully',
                  `Your location has been shared via WhatsApp with all ${successCount} contact${successCount > 1 ? 's' : ''}.`
                );
              } else if (successCount > 0) {
                Alert.alert(
                  'Partially Shared',
                  `Your location was shared with ${successCount} contact${successCount > 1 ? 's' : ''}. ${failureCount} contact${failureCount > 1 ? 's' : ''} could not be reached via WhatsApp.`
                );
              } else {
                Alert.alert(
                  'Share Failed',
                  'Unable to share location via WhatsApp. Please make sure WhatsApp is installed and the contacts have valid phone numbers.'
                );
              }
            }, 500);
            
            // Clear selected contacts after sharing
            setSelectedContacts([]);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Location</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="people-outline" size={48} color={colors.gray} />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : permissionStatus !== 'granted' ? (
            <View style={styles.permissionContainer}>
              <Ionicons name="lock-closed" size={48} color={colors.gray} />
              <Text style={styles.permissionTitle}>Contacts Permission Required</Text>
              <Text style={styles.permissionText}>
                To share your location with contacts, please grant access to your contacts.
              </Text>
              <TouchableOpacity style={commonStyles.button} onPress={getContacts}>
                <Text style={commonStyles.buttonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : filteredContacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color={colors.gray} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No contacts found matching your search' : 'No contacts found'}
              </Text>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.contactItem}
                onPress={() => toggleContact(contact.id)}
              >
                <View style={[styles.avatar, { backgroundColor: contact.avatar }]}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactDetails}>
                    {contact.phoneNumbers && contact.phoneNumbers.length > 0 
                      ? contact.phoneNumbers[0] 
                      : contact.emails && contact.emails.length > 0 
                        ? contact.emails[0] 
                        : 'No contact info'}
                  </Text>
                </View>
                {selectedContacts.includes(contact.id) ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.black} />
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {selectedContacts.length > 0 ? (
          <View style={styles.shareButton}>
            <TouchableOpacity 
              style={[commonStyles.button, isGettingLocation && { opacity: 0.7 }]} 
              onPress={handleShareLocation}
              disabled={isGettingLocation}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {isGettingLocation ? (
                  <Ionicons name="location" size={20} color={colors.white} style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="logo-whatsapp" size={20} color={colors.white} style={{ marginRight: 8 }} />
                )}
                <Text style={commonStyles.buttonText}>
                  {isGettingLocation 
                    ? 'Getting Location...' 
                    : `Share via WhatsApp (${selectedContacts.length})`
                  }
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
  contactsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    fontWeight: '500',
    color: colors.darkGray,
  },
  contactDetails: {
    fontSize: 14,
    color: colors.gray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
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
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  shareButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
});
