import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';

type HelpSupportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HelpSupport'>;

interface Props {
  navigation: HelpSupportScreenNavigationProp;
}

export default function HelpSupportScreen({ navigation }: Props): React.JSX.Element {
  const handleContactSupport = async () => {
    const email = 'support@naarikavach.com';
    const subject = 'Support Request - NaariKavach App';
    const body = 'Please describe your issue or question:\n\n';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email Not Available',
          `Please send your support request to: ${email}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Please contact support at: ${email}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCallHelpline = async () => {
    const phoneNumber = 'tel:+911234567890';
    
    try {
      const canOpen = await Linking.canOpenURL(phoneNumber);
      if (canOpen) {
        await Linking.openURL(phoneNumber);
      } else {
        Alert.alert(
          'Phone Not Available',
          'Please call our helpline at: +91 123 456 7890',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Please call our helpline at: +91 123 456 7890',
        [{ text: 'OK' }]
      );
    }
  };

  const handleOpenWebsite = async () => {
    const websiteUrl = 'https://naarikavach.com/help';
    
    try {
      const canOpen = await Linking.canOpenURL(websiteUrl);
      if (canOpen) {
        await Linking.openURL(websiteUrl);
      } else {
        Alert.alert(
          'Cannot Open Website',
          'Please visit: https://naarikavach.com/help',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Please visit: https://naarikavach.com/help',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReportBug = () => {
    Alert.alert(
      'Report Bug',
      'Thank you for helping us improve! Please describe the bug you encountered.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Report', 
          onPress: () => Alert.alert('Success', 'Bug report submitted successfully.') 
        }
      ]
    );
  };

  const HelpItem = ({ 
    title, 
    description, 
    onPress, 
    icon,
    showArrow = true
  }: { 
    title: string; 
    description: string; 
    onPress: () => void; 
    icon: keyof typeof Ionicons.glyphMap;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity style={styles.helpItem} onPress={onPress}>
      <View style={styles.helpIcon}>
        <Ionicons name={icon} size={24} color={colors.darkGray} />
      </View>
      <View style={styles.helpContent}>
        <Text style={styles.helpTitle}>{title}</Text>
        <Text style={styles.helpDescription}>{description}</Text>
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={colors.gray} />
      )}
    </TouchableOpacity>
  );

  const FAQItem = ({ 
    question, 
    answer 
  }: { 
    question: string; 
    answer: string; 
  }) => (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get Help</Text>
            
            <HelpItem
              title="Emergency Helpline"
              description="24/7 emergency support hotline"
              onPress={handleCallHelpline}
              icon="call"
            />
            
            <HelpItem
              title="Contact Support"
              description="Send us an email for technical support"
              onPress={handleContactSupport}
              icon="mail"
            />
            
            <HelpItem
              title="Help Center"
              description="Browse our comprehensive help documentation"
              onPress={handleOpenWebsite}
              icon="help-circle"
            />
            
            <HelpItem
              title="Report a Bug"
              description="Help us improve by reporting issues"
              onPress={handleReportBug}
              icon="bug"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            
            <FAQItem
              question="How do I add emergency contacts?"
              answer="Go to Profile > Emergency Contacts and tap 'Add Contact' to add trusted people who will be notified during emergencies."
            />
            
            <FAQItem
              question="How does the SOS feature work?"
              answer="Press 'I'm Feeling Unsafe' on the home screen to trigger an SOS alert. Your location will be shared with emergency contacts and authorities."
            />
            
            <FAQItem
              question="Can I use the app without internet?"
              answer="Basic SOS functionality works offline, but location sharing and WhatsApp features require an internet connection."
            />
            
            <FAQItem
              question="How is my location data protected?"
              answer="All location data is encrypted and only shared with your chosen emergency contacts or authorities during emergencies."
            />
            
            <FAQItem
              question="What should I do if the app isn't working?"
              answer="Try restarting the app. If issues persist, check your internet connection and location permissions, or contact our support team."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Information</Text>
            
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>June 2025</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Support</Text>
                <Text style={styles.infoValue}>support@naarikavach.com</Text>
              </View>
            </View>
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
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  helpIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  helpContent: {
    flex: 1,
    marginRight: spacing.lg,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  faqItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.medium,
    padding: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
  },
  infoValue: {
    fontSize: 14,
    color: colors.gray,
  },
});
