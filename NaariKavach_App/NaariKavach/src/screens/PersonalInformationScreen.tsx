import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import { useAuth } from '../contexts/AuthContext';
import { PersonalInfoStorage, PersonalInfo } from '../services/personalInfoStorage';

type PersonalInformationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PersonalInformation'>;

interface Props {
  navigation: PersonalInformationScreenNavigationProp;
}

export default function PersonalInformationScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<PersonalInfo>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    lastUpdated: undefined,
  });

  // Load data from storage when component mounts
  useEffect(() => {
    loadPersonalInfo();
  }, []);

  const loadPersonalInfo = async () => {
    try {
      setIsLoading(true);
      const userEmail = user?.email || 'default';
      const storedData = await PersonalInfoStorage.getPersonalInfo(userEmail);
      
      if (storedData) {
        setFormData(storedData);
      } else {
        // If no stored data, use default values from user context
        setFormData({
          fullName: user?.username || '',
          email: user?.email || '',
          phone: '',
          address: '',
          emergencyContact: '',
          lastUpdated: undefined,
        });
      }
    } catch (error) {
      console.error('Error loading personal information:', error);
      Alert.alert('Error', 'Failed to load personal information');
      // Fallback to user context data
      setFormData({
        fullName: user?.username || '',
        email: user?.email || '',
        phone: '',
        address: '',
        emergencyContact: '',
        lastUpdated: undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const userEmail = user?.email || 'default';
      const success = await PersonalInfoStorage.savePersonalInfo(userEmail, formData);
      
      if (success) {
        Alert.alert(
          'Save Changes',
          'Your personal information has been updated successfully.',
          [{ text: 'OK', onPress: () => setIsEditing(false) }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to save your personal information. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancel = () => {
    // Reload the original data from storage
    loadPersonalInfo();
    setIsEditing(false);
  };

  const formatLastUpdated = (lastUpdated: string | undefined): string => {
    if (!lastUpdated) return '';
    
    try {
      const date = new Date(lastUpdated);
      return `Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } catch (error) {
      return '';
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Ionicons 
              name={isEditing ? "close" : "pencil"} 
              size={24} 
              color={colors.darkGray} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.darkGray} />
              <Text style={styles.loadingText}>Loading personal information...</Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputReadonly]}
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({...formData, fullName: text})}
                    editable={isEditing}
                    placeholder="Enter your full name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputReadonly]}
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    editable={isEditing}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputReadonly]}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                    editable={isEditing}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, !isEditing && styles.inputReadonly]}
                    value={formData.address}
                    onChangeText={(text) => setFormData({...formData, address: text})}
                    editable={isEditing}
                    placeholder="Enter your address"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Primary Emergency Contact</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputReadonly]}
                    value={formData.emergencyContact}
                    onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
                    editable={isEditing}
                    placeholder="Enter emergency contact number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {isEditing && (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[commonStyles.button, styles.cancelButton]} 
                    onPress={handleCancel}
                  >
                    <Text style={[commonStyles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[commonStyles.button, styles.saveButton]} 
                    onPress={handleSave}
                  >
                    <Text style={commonStyles.buttonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!isEditing && formData.lastUpdated && (
                <View style={styles.lastUpdatedContainer}>
                  <Text style={styles.lastUpdatedText}>
                    {formatLastUpdated(formData.lastUpdated)}
                  </Text>
                </View>
              )}
            </>
          )}
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
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.darkGray,
    backgroundColor: colors.white,
  },
  inputReadonly: {
    backgroundColor: colors.lightGray,
    color: colors.gray,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  cancelButtonText: {
    color: colors.darkGray,
  },
  saveButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: spacing.lg,
  },
  lastUpdatedContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
  },
});
