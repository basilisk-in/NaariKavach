import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { commonStyles, colors, spacing, borderRadius } from '../styles/commonStyles';
import LandingSvg from '../components/LandingSvg';

// Check Text Responsiveness
type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Landing'>;


interface Props {
  navigation: LandingScreenNavigationProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const svgWidth = screenWidth * 1.18; // 100% of screen width , reduce if needed
const svgHeight = (svgWidth * 360) / 400; // Text Controls numerator reduction to push text up and denominator to push it down
const dynamicOffset = screenWidth * 0.04; // Moves SVG to the right(offset) based on screen width

//Requires Testing on different screen sizes
const isSmallScreen = screenWidth < 375;
const isLargeScreen = screenWidth > 414;

export default function LandingScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>        
        <View style={styles.logoSection}>
          <View style={styles.customLogo}>
            <View style={styles.svgContainer}>
              <LandingSvg 
                width={svgWidth} 
                height={svgHeight}
                fill={colors.black}
              />
            </View>
            <View style={styles.logoTextContainer}>
              <Text style={styles.naariText}>Naari कवच</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[commonStyles.button, styles.getStartedButton]}
            onPress={() => navigation.navigate('UserLogin')}
          >
            <Text style={commonStyles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.policeButton}
            onPress={() => navigation.navigate('PoliceLogin')}
          >
            <Text style={styles.policeButtonText}>Police Portal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    transform: [{ translateX: dynamicOffset }],
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  naariText: {
    fontSize: isSmallScreen ? 40 : isLargeScreen ? 58 : 50,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: 1,
    marginRight: spacing.xs,
  },
  kavachText: {
    fontSize: isSmallScreen ? 36 : isLargeScreen ? 62 : 54,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.darkGray,
    marginTop: spacing.lg,
  },
  buttonSection: {
    paddingBottom: spacing.xl,
  },
  getStartedButton: {
    height: 48,
    borderRadius: borderRadius.medium,
  },
  policeButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  policeButtonText: {
    color: colors.gray,
    fontSize: 14,
    fontWeight: '400',
  },
});
