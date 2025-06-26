import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import { useAuth } from '../contexts/AuthContext';

type PoliceLoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PoliceLogin'>;

interface Props {
  navigation: PoliceLoginScreenNavigationProp;
}

export default function PoliceLoginScreen({ navigation }: Props): React.JSX.Element {
  const [unitId, setOfficerId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();

  const handleLogin = async (): Promise<void> => {
    if (!unitId || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    try {
      setIsLoading(true);
      await login(unitId, password);
      Alert.alert('Success', 'Login successful');
      navigation.navigate("PoliceTabs", {unitId: unitId});
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
          </TouchableOpacity>          
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Naari कवच</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={commonStyles.title}>Police Login</Text>
          
          <View style={styles.form}>
            <TextInput
              style={commonStyles.input}
              placeholder="Unit ID"
              value={unitId}
              onChangeText={setOfficerId}
              autoCapitalize="none"
            />
            
            <TextInput
              style={commonStyles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={commonStyles.button} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (<Text style={commonStyles.buttonText}>Log In</Text>)}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity>
            <Text style={styles.supportText}>Need Assistance? Contact Support</Text>
          </TouchableOpacity>
        </View>
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
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    color: colors.gray,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  supportText: {
    color: colors.gray,
    fontSize: 14,
    fontWeight: '400',
  },
});
