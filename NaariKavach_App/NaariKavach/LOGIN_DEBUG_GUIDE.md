# Login Issue Debugging Guide

## Problem Summary
The login appears successful in the UI but the user doesn't stay logged in. The authentication state is not being properly maintained.

## Root Causes Identified

1. **Race Condition in Login Flow**: The AuthContext was requiring both token AND user data to be present for successful login, but the user data fetch might fail silently.

2. **Poor Error Handling**: The `getCurrentUser()` API call could fail without proper error propagation.

3. **JSON Parsing Issues**: The API might return HTML instead of JSON in error cases, causing JSON parse errors.

## Changes Made

### 1. Services.tsx (`authApi.login`)
**Before**: Failed silently if `getCurrentUser()` failed after successful token retrieval.
**After**: 
- Added console logging for token save success
- Made user data fetch failure non-blocking for login success
- Added error logging for user data fetch failures

### 2. AuthContext.tsx (`login` method)
**Before**: Required both token and user data to be present for successful login.
**After**:
- Login is considered successful if token is saved
- User data is fetched separately and doesn't block login success
- Added fallback user data fetch if not immediately available

### 3. Services.tsx (`getCurrentUser`)
**Before**: No token validation before API call.
**After**:
- Checks for token presence before making API call
- Added detailed logging for success/failure
- Better error messages

### 4. Services.tsx (`fetchApi`)
**Before**: Basic JSON parsing without content-type checking.
**After**:
- Checks content-type header before parsing JSON
- Logs non-JSON responses for debugging
- Better error messages for parse failures
- Handles server errors that return HTML instead of JSON

### 5. UserLoginScreen.tsx
**Before**: Basic error handling.
**After**:
- Added console logging for debugging
- Better success/failure feedback
- Relies on AppNavigator for navigation after login

## Testing the Fix

### 1. Check Console Logs
When you attempt to login, you should see these logs:
```
Attempting login with username: [username]
Saving auth token: [token]
Token saved successfully
User data saved successfully: [user object]
Login successful
```

### 2. Verify Authentication State
After login, check that:
- `isAuthenticated` becomes `true` in AuthContext
- `user` object is populated in AuthContext
- `token` is present in AuthContext
- App navigates to authenticated screens

### 3. Test API Endpoints
If login still fails, check:
1. **Backend Status**: Ensure the backend server is running
2. **API URLs**: Verify `API_BASE_URL` in services.tsx matches your backend
3. **Network Connectivity**: Check if the device/emulator can reach the backend

### 4. Common Issues and Solutions

#### Issue: "JSON Parse error: Unexpected character: <"
**Cause**: Backend returning HTML error page instead of JSON
**Solution**: Check backend logs, ensure correct endpoint URLs

#### Issue: Login successful but user not authenticated
**Cause**: Token saved but user data fetch failed
**Solution**: Check `/auth/users/me/` endpoint, verify token format

#### Issue: Authentication fails on app restart
**Cause**: Token not properly stored or retrieved
**Solution**: Check AsyncStorage permissions, verify token persistence

## API Endpoint Verification

Ensure these endpoints are working on your backend:

1. **POST /auth/token/login/** - Should return `{auth_token: "..."}`
2. **GET /auth/users/me/** - Should return user object with Authorization header
3. **POST /auth/token/logout/** - Should invalidate token

## Debug Commands

Test individual API calls:
```javascript
// Test login
const response = await authApi.login('username', 'password');
console.log('Login response:', response);

// Test token retrieval
const token = await tokenManager.getToken();
console.log('Stored token:', token);

// Test user data retrieval
const user = await tokenManager.getUserData();
console.log('Stored user:', user);
```

## Next Steps

1. Test the login flow with the updated code
2. Check console logs for detailed error information
3. Verify that authentication state persists across app restarts
4. If issues persist, check backend logs and API responses
