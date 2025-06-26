import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { UserTabParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type ShareLocationScreenNavigationProp = BottomTabNavigationProp<UserTabParamList, 'Safety'>;

interface Contact {
  id: number;
  name: string;
  relationship: string;
  avatar: string;
}

interface Props {
  navigation: ShareLocationScreenNavigationProp;
}

const contacts: Contact[] = [
  { id: 1, name: 'Sophia', relationship: 'Family', avatar: '#FF6B6B' },
  { id: 2, name: 'Ethan', relationship: 'Friend', avatar: '#4ECDC4' },
  { id: 3, name: 'Olivia', relationship: 'Friend', avatar: '#45B7D1' },
  { id: 4, name: 'Noah', relationship: 'Friend', avatar: '#96CEB4' },
  { id: 5, name: 'Ava', relationship: 'Friend', avatar: '#FECA57' },
  { id: 6, name: 'Liam', relationship: 'Friend', avatar: '#FF9FF3' },
  { id: 7, name: 'Isabella', relationship: 'Friend', avatar: '#54A0FF' },
  { id: 8, name: 'Jackson', relationship: 'Friend', avatar: '#5F27CD' },
];

export default function ShareLocationScreen({ navigation }: Props): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (contactId: number): void => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
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
          {filteredContacts.map((contact) => (
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
                <Text style={styles.contactRelationship}>{contact.relationship}</Text>
              </View>
              {selectedContacts.includes(contact.id) ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.black} />
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedContacts.length > 0 ? (
          <View style={styles.shareButton}>
            <TouchableOpacity style={commonStyles.button}>
              <Text style={commonStyles.buttonText}>
                Share Location ({selectedContacts.length})
              </Text>
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
  contactRelationship: {
    fontSize: 14,
    color: colors.gray,
  },
  shareButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
});
