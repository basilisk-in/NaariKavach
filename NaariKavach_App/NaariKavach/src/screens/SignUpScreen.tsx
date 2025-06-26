import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import { useAuth } from '../contexts/AuthContext';

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

export default function SignUpScreen({ navigation }: Props): React.JSX.Element {
  const { register, isLoading } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');

const handleSignUp = async (): Promise<void> => {
  let valid = true;
  setPasswordError('');
  setConfirmPasswordError('');

  if (!username || !email || !phoneNumber || !password || !confirmPassword) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  if (password.length < 8) {
    setPasswordError('Password must be at least 8 characters long.');
    valid = false;
  }

  if (password !== confirmPassword) {
    setConfirmPasswordError('Passwords do not match. Please try again.');
    valid = false;
  }

  if (!valid) return;

  try {
    const success = await register(username, email, password, confirmPassword);
    if (success) {
      Alert.alert('Success', 'Account created successfully');
      navigation.navigate('UserLogin');
    } else {
      Alert.alert('Error', 'Failed to create account');
    }
  } catch (error) {
    Alert.alert('Error', 'Something went wrong during sign up');
  }
};
  

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>          
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Naariकवच</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={commonStyles.title}>Create Account</Text>
          
          <View style={styles.form}>
            <TextInput
              style={commonStyles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />
            
            <TextInput
              style={commonStyles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={commonStyles.input}
              placeholder="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={commonStyles.input}    
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
              setPassword(text);
              if (text.length >= 8) setPasswordError('');
           }}
  secureTextEntry
/>
{passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

<TextInput
  style={commonStyles.input}
  placeholder="Confirm Password"
  value={confirmPassword}
  onChangeText={(text) => {
    setConfirmPassword(text);
    if (text === password) setConfirmPasswordError('');
  }}
  secureTextEntry
/>
{confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            
            <TouchableOpacity style={commonStyles.button} onPress={handleSignUp}>
              <Text style={commonStyles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('UserLogin')}>
            <Text style={styles.loginText}>Already have an account? Log In</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loginText: {
    color: colors.gray,
    fontSize: 14,
    fontWeight: '400',
  },
  errorText: {
  color: 'red',
  fontSize: 13,
  marginTop: -10,
  marginBottom: 10,
  marginLeft: 5,
},
});
