import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors, spacing } from '../styles/commonStyles';
import LandingSvg from '../components/LandingSvg';
import { useAuth } from '../contexts/AuthContext';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const splashSvgWidth = screenWidth * 1.18; // Increased to 80% of screen width for splash
const splashSvgHeight = (splashSvgWidth * 360) / 400; // Maintain aspect ratio
const dynamicOffset = screenWidth * 0.07

export default function SplashScreen({ navigation }: Props): React.JSX.Element {
  const { isAuthenticated, isInitializing } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Start logo animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // Text animation after logo
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animated loading dots
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dotAnim1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]).start(() => animateDots());
    };

    const dotTimer = setTimeout(animateDots, 1000);

    // Navigation logic: if we're not initializing anymore, handle navigation
    if (!isInitializing) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          // User has saved token, navigate to main app
          // The navigation will be handled by AppNavigator automatically
          return;
        } else {
          // No saved token, go to Landing screen
          navigation.replace('Landing');
        }
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearTimeout(dotTimer);
      };
    }

    return () => {
      clearTimeout(dotTimer);
    };
  }, [navigation, isAuthenticated, isInitializing, fadeAnim, scaleAnim, textFadeAnim, textSlideAnim, dotAnim1, dotAnim2, dotAnim3]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateX: dynamicOffset }],
            },
          ]}
        >
          <LandingSvg 
            width={splashSvgWidth} 
            height={splashSvgHeight}
            fill={colors.darkGray}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.textContainer,
            {
              opacity: textFadeAnim,
              transform: [{ translateY: textSlideAnim }],
            },
          ]}
        >
          <Text style={styles.appName}>Naari कवच</Text>
          <Text style={styles.tagline}>Empowering Women's Safety</Text>
        </Animated.View>
      </View>
      
      <Animated.View 
        style={[
          styles.footer,
          {
            opacity: textFadeAnim,
          },
        ]}
      >
        <View style={styles.loadingIndicator}>
          <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl * 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.darkGray,
    marginHorizontal: 4,
  },
});
