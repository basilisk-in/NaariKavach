import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for API endpoints and storage keys
const API_BASE_URL = 'http://192.168.137.1:8000';  // Update this with your actual API base URL
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const EMERGENCY_CONTACTS_KEY = 'emergency_contacts';



// Types for API responses and requests
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: string;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  avatar?: string;
  addedAt: string;
}

export interface AuthTokenResponse {
  auth_token: string;
}

export interface LocationUpdate {
  id: number;
  sos_request: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface OfficerAssignment {
  id: number;
  sos_request: number;
  officer_name: string;
  unit_number: string;
  assigned_at: string;
}

export interface SOSData {
  id: number;
  name: string;
  sos_type: number;
  status_flag: number;
  initial_latitude: number;
  initial_longitude: number;
  unit_number_dispatched: string | null;
  acknowledged_flag: number;
  room_id: string;
  created_at: string;
  updated_at: string;
  user: number | null;
  location_updates: LocationUpdate[];
  officer_assignments: OfficerAssignment[];
}

export interface SOSCreateResponse {
  status: string;
  message: string;
  sos_id: number;
  room_id: string;
}

// Utility function for handling API errors
const handleApiError = (error: any, customMessage?: string): ApiResponse<any> => {
  console.error('API Error:', error);
  
  const errorMessage = customMessage || 'Something went wrong. Please try again.';
  
  // You can choose to show an alert for critical errors
  Alert.alert('Error', errorMessage);
  
  return {
    success: false,
    error: error?.message || errorMessage
  };
};

// Generic fetch wrapper for API calls
async function fetchApi<T>(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  headers: Record<string, string> = {},
  requiresAuth: boolean = true
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Build headers with authentication token if required
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    
    // Add authentication token to headers if needed
    if (requiresAuth) {
      const token = await tokenManager.getToken();
      if (token) {
        requestHeaders['Authorization'] = `Token ${token}`;
      } else {
        // If token is required but not found, you might want to handle this case
        // For example, redirect to login or return an error
        console.warn('Auth token not found for authenticated request');
      }
    }
    
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, requestOptions);
    
    // Handle token expiration or auth errors
    if (response.status === 401 && requiresAuth) {
      // Token might be expired or invalid
      console.warn('Authentication failed - token may be expired');
      // Optionally clear auth data and redirect to login
      await tokenManager.clearAuthData();
      // You could implement a callback for handling auth failures
      // authFailureCallback();
      
      return {
        success: false,
        error: 'Authentication failed. Please log in again.'
      };
    }
    
    // Handle 204 No Content response specifically (common for DELETE and some POST operations like logout)
    if (response.status === 204) {
      return {
        success: true,
        data: null as unknown as T, // Cast to T since we know it's null but TypeScript expects T
        message: 'Operation successful'
      };
    }
    
    // Parse JSON for all other responses
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || data.message || `Error: ${response.status} ${response.statusText}`
      };
    }
    
    return {
      success: true,
      data: data as T,
      message: data.message
    };
    
  } catch (error) {
    return handleApiError(error);
  }
}

// Authentication related API calls
export const authApi = {
  register: async (username: string, email: string, password: string, re_password: string): Promise<ApiResponse<UserData>> => {
    try {
      const response = await fetchApi<UserData>(
        '/auth/users/', 
        'POST', 
        { username, email, password, re_password },
        {},
        false // Does not require authentication
      );
      
      return response;
    } catch (error) {
      return handleApiError(error, 'Registration failed. Please try again.');
    }
  },
  
  login: async (username: string, password: string): Promise<ApiResponse<AuthTokenResponse>> => {
    try {
      // Auth endpoints don't need authentication themselves
      const response = await fetchApi<AuthTokenResponse>(
        '/auth/token/login/', 
        'POST', 
        { username, password },
        {},
        false // Does not require authentication
      );
      
      if (response.success && response.data) {
        // Store token upon successful login
        await tokenManager.saveToken(response.data.auth_token);
        
        // Get user profile to store user data
        await authApi.getCurrentUser();
      }
      
      return response;
    } catch (error) {
      return handleApiError(error, 'Login failed. Please check your credentials.');
    }
  },
  
  logout: async (): Promise<ApiResponse<null>> => {
    try {
      // First make the API call to logout (requires auth token)
      const response = await fetchApi<null>(
        '/auth/token/logout/', 
        'POST',
        undefined,
        {
          'Authorization': `Token ${await tokenManager.getToken()}`
        }
      );
      
      // Whether or not the API call succeeds, clear local storage
      await tokenManager.clearAuthData();
      
      return response;
    } catch (error) {
      // Still clear local data even if the API call fails
      await tokenManager.clearAuthData();
      return handleApiError(error, 'Logout failed.');
    }
  },
  
  getCurrentUser: async (): Promise<ApiResponse<UserData>> => {
    try {
      const token = await tokenManager.getToken();
      const response = await fetchApi<UserData>(
        '/auth/users/me/', 
        'GET', 
        undefined,
        {
          'Authorization': `Token ${token}`
        }
      );
      
      if (response.success && response.data) {
        // Store user data
        await tokenManager.saveUserData(response.data);
      }
      
      return response;
    } catch (error) {
      return handleApiError(error, 'Failed to get user information.');
    }
  },
};

// SOS related API calls
export const sosApi = {
  createSOS: async (
    name: string,
    sos_type: number,
    initial_latitude: number,
    initial_longitude: number
  ): Promise<ApiResponse<SOSCreateResponse>> => {
    try {
      return await fetchApi<SOSCreateResponse>(
        '/api/create-sos/',
        'POST', 
        { name, sos_type, initial_latitude, initial_longitude },
        {},
        false // No authentication required for SOS creation
      );
    } catch (error) {
      return handleApiError(error, 'Failed to create SOS alert.');
    }
  },
  
  getAllSOS: async (): Promise<ApiResponse<SOSData[]>> => {
    try {
      const token = await tokenManager.getToken();
      return await fetchApi<SOSData[]>(
        '/api/sos/',
        'GET',
        undefined,
        {
          'Authorization': `Token ${token}`
        }
      );
    } catch (error) {
      return handleApiError(error, 'Failed to fetch SOS alerts.');
    }
  },
  
  getSOS: async (sosId: number): Promise<ApiResponse<SOSData>> => {
    try {
      const token = await tokenManager.getToken();
      return await fetchApi<SOSData>(
        `/api/sos/${sosId}/`,
        'GET',
        undefined,
        {
          'Authorization': `Token ${token}`
        }
      );
    } catch (error) {
      return handleApiError(error, 'Failed to fetch SOS details.');
    }
  },
  
  updateLocation: async (
    sos_request: number,
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<{ status: string }>> => {
    try {
      return await fetchApi<{ status: string }>(
        '/api/update-location/',
        'POST',
        { sos_request, latitude, longitude },
        {},
        false // No authentication needed for location updates
      );
    } catch (error) {
      return handleApiError(error, 'Failed to update location.');
    }
  },
  
  assignOfficer: async (
    sos_request: number,
    officer_name: string,
    unit_number: string
  ): Promise<ApiResponse<{ status: string, officer: OfficerAssignment }>> => {
    try {
      const token = await tokenManager.getToken();
      return await fetchApi<{ status: string, officer: OfficerAssignment }>(
        '/api/assign-officer/',
        'POST',
        { sos_request, officer_name, unit_number },
        {
          'Authorization': `Token ${token}`
        }
      );
    } catch (error) {
      return handleApiError(error, 'Failed to assign officer.');
    }
  },
  
  resolveSOS: async (sosId: number): Promise<ApiResponse<{ status: string, sos: SOSData }>> => {
    try {
      const token = await tokenManager.getToken();
      return await fetchApi<{ status: string, sos: SOSData }>(
        `/api/resolve-sos/${sosId}/`,
        'POST',
        undefined,
        {
          'Authorization': `Token ${token}`
        }
      );
    } catch (error) {
      return handleApiError(error, 'Failed to resolve SOS alert.');
    }
  }
};

// WebSocket related types and functionality
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private roomId: string | null = null;
  private wsType: 'sos' | 'location' | 'officer' | 'admin' = 'sos';
  private messageHandlers: Array<(message: WebSocketMessage) => void> = [];
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private wsUrl: string | null = null;
  
  constructor() {
    // Initialize without connecting
  }
  
  // Connect to a specific WebSocket
  public connect(roomId: string, type: 'sos' | 'location' | 'officer' | 'admin' = 'sos'): void {
    this.disconnect(); // Close any existing connection
    
    this.roomId = roomId;
    this.wsType = type;
    
    // Build the WebSocket URL based on type
    let wsEndpoint: string;
    
    switch (type) {
      case 'sos':
        wsEndpoint = `ws/sos/${roomId}/`;
        break;
      case 'location':
        wsEndpoint = `ws/location/${roomId}/`;
        break;
      case 'officer':
        wsEndpoint = `ws/officer/${roomId}/`;
        break;
      case 'admin':
        wsEndpoint = 'ws/admin/locations/';
        break;
      default:
        wsEndpoint = `ws/sos/${roomId}/`;
    }
    
    // Create WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = wsProtocol + '//api.naarikavach.in'; // Update with your actual WebSocket base URL
    this.wsUrl = `${wsBaseUrl}/${wsEndpoint}`;
    
    try {
      this.socket = new WebSocket(this.wsUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.notifyConnectionChange(false);
    }
  }
  
  // Disconnect and clean up
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  // Send a message
  public send(message: WebSocketMessage): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    } else {
      console.error('WebSocket not connected. Cannot send message.');
      return false;
    }
  }
  
  // Check if connected
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Add a message handler
  public addMessageHandler(handler: (message: WebSocketMessage) => void): void {
    this.messageHandlers.push(handler);
  }
  
  // Remove a message handler
  public removeMessageHandler(handler: (message: WebSocketMessage) => void): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }
  
  // Add a connection state change handler
  public addConnectionHandler(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
    // Notify right away of current state
    if (this.isConnected()) {
      handler(true);
    }
  }
  
  // Remove a connection handler
  public removeConnectionHandler(handler: (connected: boolean) => void): void {
    const index = this.connectionHandlers.indexOf(handler);
    if (index !== -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }
  
  // Handle WebSocket open event
  private handleOpen(): void {
    console.log('WebSocket connection established');
    this.notifyConnectionChange(true);
  }
  
  // Handle WebSocket close event
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.notifyConnectionChange(false);
    
    // Auto-reconnect logic
    if (this.roomId && this.wsUrl) {
      this.reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        this.connect(this.roomId!, this.wsType);
      }, 3000); // Try to reconnect after 3 seconds
    }
  }
  
  // Handle WebSocket messages
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Notify all message handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      });
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }
  
  // Handle WebSocket errors
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.notifyConnectionChange(false);
  }
  
  // Notify connection state change
  private notifyConnectionChange(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in WebSocket connection handler:', error);
      }
    });
  }
}

// Token management functions
export const tokenManager = {
  // Save authentication token to AsyncStorage
  saveToken: async (token: string): Promise<void> => {
    console.log('Saving auth token:', token);
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving auth token:', error);
    }
  },

  // Get the authentication token from AsyncStorage
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY) as string | null;
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  },

  // Remove the authentication token (for logout)
  removeToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  },

  // Save user data to AsyncStorage
  saveUserData: async (userData: UserData): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  // Get user data from AsyncStorage
  getUserData: async (): Promise<UserData | null> => {
    try {
      const data = await AsyncStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  },

  // Remove user data from AsyncStorage
  removeUserData: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  },

  // Clear all authentication data (token and user data)
  clearAuthData: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }
};

// Emergency contacts manager
export const emergencyContactsManager = {
  // Save emergency contacts to AsyncStorage
  saveEmergencyContacts: async (contacts: EmergencyContact[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error('Error saving emergency contacts:', error);
      throw error;
    }
  },

  // Get emergency contacts from AsyncStorage
  getEmergencyContacts: async (): Promise<EmergencyContact[]> => {
    try {
      const contactsJson = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
      return contactsJson ? JSON.parse(contactsJson) : [];
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      return [];
    }
  },

  // Add emergency contact
  addEmergencyContact: async (contact: Omit<EmergencyContact, 'id' | 'addedAt'>): Promise<EmergencyContact[]> => {
    try {
      const existingContacts = await emergencyContactsManager.getEmergencyContacts();
      
      // Check if contact already exists
      const isDuplicate = existingContacts.some(
        existing => existing.phoneNumber === contact.phoneNumber
      );
      
      if (isDuplicate) {
        throw new Error('This contact is already in your emergency contacts list');
      }

      const newContact: EmergencyContact = {
        ...contact,
        id: Date.now().toString(),
        addedAt: new Date().toISOString(),
      };

      const updatedContacts = [...existingContacts, newContact];
      await emergencyContactsManager.saveEmergencyContacts(updatedContacts);
      return updatedContacts;
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw error;
    }
  },

  // Remove emergency contact
  removeEmergencyContact: async (contactId: string): Promise<EmergencyContact[]> => {
    try {
      const existingContacts = await emergencyContactsManager.getEmergencyContacts();
      const updatedContacts = existingContacts.filter(contact => contact.id !== contactId);
      await emergencyContactsManager.saveEmergencyContacts(updatedContacts);
      return updatedContacts;
    } catch (error) {
      console.error('Error removing emergency contact:', error);
      throw error;
    }
  },

  // Clear all emergency contacts
  clearEmergencyContacts: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(EMERGENCY_CONTACTS_KEY);
    } catch (error) {
      console.error('Error clearing emergency contacts:', error);
      throw error;
    }
  },
};

// Create a WebSocketManager instance for export
export const webSocketManager = new WebSocketManager();

// Export a default object with all API modules for easy importing
export default {
  auth: authApi,
  sos: sosApi,
  token: tokenManager,
  ws: webSocketManager
};