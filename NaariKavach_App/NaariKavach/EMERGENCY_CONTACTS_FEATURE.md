# Emergency Contacts Feature

## Overview
The Emergency Contacts feature allows users to select and manage contacts from their device contact list who will receive emergency location updates during unsafe situations.

## Features

### 1. Emergency Contacts Management
- **View Current Emergency Contacts**: Display all saved emergency contacts with names, phone numbers, and emails
- **Add Emergency Contacts**: Select contacts from device contact list to add as emergency contacts
- **Remove Emergency Contacts**: Remove contacts from the emergency list
- **Persistent Storage**: All emergency contacts are stored locally using AsyncStorage

### 2. UI/UX Design
- **Consistent Design**: Follows the app's existing design patterns and color scheme
- **Contact Avatars**: Colorful avatar circles with initials for visual contact identification
- **Search Functionality**: Search through device contacts when adding new emergency contacts
- **Responsive Design**: Optimized for different screen sizes

### 3. Permissions & Security
- **Contact Permissions**: Requests device contact permissions with clear explanations
- **Local Storage**: No backend dependency - all data stored locally on device
- **Duplicate Prevention**: Prevents adding the same contact multiple times

## File Structure

### Services
- `src/services/services.tsx` - Added emergency contacts management functions:
  - `emergencyContactsManager.getEmergencyContacts()`
  - `emergencyContactsManager.addEmergencyContact()`
  - `emergencyContactsManager.removeEmergencyContact()`
  - `emergencyContactsManager.saveEmergencyContacts()`
  - `emergencyContactsManager.clearEmergencyContacts()`

### Screens
- `src/screens/EmergencyContactsScreen.tsx` - Main emergency contacts management screen
- `src/screens/AddEmergencyContactScreen.tsx` - Screen to add new emergency contacts from device contacts

### Navigation
- Updated `AppNavigator.tsx` to include new routes:
  - `EmergencyContacts` - Main emergency contacts screen
  - `AddEmergencyContact` - Add new emergency contact screen
- Updated `ProfileScreen.tsx` to navigate to emergency contacts

## Data Structure

```typescript
interface EmergencyContact {
  id: string;              // Unique identifier
  name: string;            // Contact name
  phoneNumber: string;     // Primary phone number
  email?: string;          // Optional email address
  avatar?: string;         // Avatar color for UI
  addedAt: string;         // ISO date string when contact was added
}
```

## Usage Flow

1. **Access**: User taps "Emergency Contacts" in Profile screen
2. **View**: See all current emergency contacts or empty state
3. **Add Contact**: 
   - Tap "Add" button or "Add Your First Contact"
   - Grant contacts permission if needed
   - Search and select from device contacts
   - Contact is automatically added to emergency list
4. **Remove Contact**: Tap trash icon and confirm removal
5. **Navigation**: Back button returns to previous screen

## Storage

- **Key**: `emergency_contacts`
- **Format**: JSON array of EmergencyContact objects
- **Persistence**: Data persists across app sessions
- **Location**: Device local storage (AsyncStorage)

## Integration Points

The emergency contacts can be integrated with:
- Share Location feature (send location to emergency contacts)
- Emergency alert system (notify emergency contacts during alerts)
- SOS functionality (automatic notification to emergency contacts)

## Error Handling

- Contact permission denied: Shows explanatory message with retry option
- Duplicate contacts: Prevents adding same phone number twice
- Storage errors: Graceful error handling with user feedback
- Network-independent: Works without internet connection

## Future Enhancements

- Contact relationship labels (e.g., "Family", "Friend", "Work")
- Custom emergency messages per contact
- Contact verification (confirm phone numbers are active)
- Backup/sync emergency contacts to cloud
- Group messaging capabilities
