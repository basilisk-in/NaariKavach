import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../styles/commonStyles';

// Import screens
import LandingScreen from '../screens/LandingScreen';
import SplashScreen from '../screens/SplashScreen';
import UserLoginScreen from '../screens/UserLoginScreen';
import PoliceLoginScreen from '../screens/PoliceLoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import UserDashboardScreen from '../screens/UserDashboardScreen';
import ShareLocationScreen from '../screens/ShareLocationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PoliceDashboardScreen from '../screens/PoliceDashboardScreen';
import AlertDetailsScreen from '../screens/AlertDetailsScreen';
import PoliceAlertsScreen from '../screens/PoliceAlertsScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import AddEmergencyContactScreen from '../screens/AddEmergencyContactScreen';

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  UserLogin: undefined;
  PoliceLogin: undefined;
  SignUp: undefined;
  UserTabs: undefined;
  PoliceTabs: undefined;
  AlertDetails: { alert?: any };
  EmergencyContacts: undefined;
  AddEmergencyContact: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Safety: undefined;
  Profile: undefined;
};

export type PoliceTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Map: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<UserTabParamList>();
const PoliceTab = createBottomTabNavigator<PoliceTabParamList>();

// User Tab Navigator
function UserTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#141414',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      })}
    ><Tab.Screen name="Home" component={UserDashboardScreen} />
      <Tab.Screen 
        name="Safety" 
        component={ShareLocationScreen}
        options={{
          tabBarLabel: 'Share Location',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'location' : 'location-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Police Tab Navigator
function PoliceTabNavigator(): React.JSX.Element {
  return (
    <PoliceTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'alert-circle' : 'alert-circle-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else {
            iconName = 'grid-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#141414',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      })}
    >
      <PoliceTab.Screen name="Dashboard" component={PoliceDashboardScreen} />
      <PoliceTab.Screen name="Alerts" component={PoliceAlertsScreen} />
    </PoliceTab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator(): React.JSX.Element {
  const { isAuthenticated, isInitializing } = useAuth();

  // Show splash screen while checking authentication status
  if (isInitializing) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={isAuthenticated ? "UserTabs" : "Splash"}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack - when user is not logged in
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="UserLogin" component={UserLoginScreen} />
            <Stack.Screen name="PoliceLogin" component={PoliceLoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          // Main App Stack - when user is logged in
          <>
            <Stack.Screen name="UserTabs" component={UserTabNavigator} />
            <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} />
            <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
            <Stack.Screen name="AddEmergencyContact" component={AddEmergencyContactScreen} />
          </>
        )}
        {/* Police screens - these can be accessed from either auth state for now */}
        <Stack.Screen name="PoliceTabs" component={PoliceTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
