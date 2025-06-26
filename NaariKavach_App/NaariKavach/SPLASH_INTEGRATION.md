# Splash Screen Integration

## Overview
The splash screen has been integrated to show during user auto-login when a saved token is found.

## How it Works

### Initial App Launch
1. **App starts** → AuthContext begins checking for saved tokens
2. **`isInitializing = true`** → AppNavigator shows SplashScreen
3. **AuthContext checks for saved token/user data**
4. **If saved token exists**:
   - Shows splash screen for 2 seconds minimum
   - Auto-logs user in
   - Sets `isAuthenticated = true`
   - `isInitializing = false`
   - AppNavigator automatically switches to authenticated screens
5. **If no saved token**:
   - `isInitializing = false`
   - SplashScreen navigates to LandingScreen after 3 seconds

### Key Changes Made

#### AuthContext.tsx
- Added `isInitializing` state to track initial authentication check
- Added 2-second delay when auto-logging in with saved tokens
- Provides `isInitializing` in context

#### AppNavigator.tsx
- Shows SplashScreen when `isInitializing = true`
- Removed loading spinner, replaced with splash screen
- Proper navigation flow based on authentication status

#### SplashScreen.tsx
- Now aware of authentication context
- Different navigation logic:
  - If `isInitializing = false` and `isAuthenticated = true`: Auto-handled by AppNavigator
  - If `isInitializing = false` and `isAuthenticated = false`: Navigate to Landing

## User Experience
- **New user**: Splash → Landing → Login/Register
- **Returning user with saved token**: Splash (2s) → Dashboard
- **Returning user without saved token**: Splash (3s) → Landing

## Duration
- Auto-login: 2 seconds minimum (ensures smooth transition)
- First-time launch: 3 seconds (as originally designed)
