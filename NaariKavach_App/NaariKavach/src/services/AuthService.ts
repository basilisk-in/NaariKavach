import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'user_auth_token';
const USER_DATA_KEY = 'user_data';

export interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: UserData;
}

class AuthService {
  // Save token and user data
  async saveToken(token: string, userData: UserData): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  }

  // Get saved token
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Get saved user data
  async getUserData(): Promise<UserData | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Remove token and user data (logout)
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_DATA_KEY]);
    } catch (error) {
      console.error('Error removing token:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      return token !== null;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Mock login function (replace with your actual API call)
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication logic
      if (email && password) {
        // Mock successful response
        const mockUser: UserData = {
          id: '1',
          email: email,
          name: email.split('@')[0], // Use part before @ as name
          phone: '+1234567890',
        };

        const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save token and user data
        await this.saveToken(mockToken, mockUser);

        return {
          token: mockToken,
          user: mockUser,
        };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await this.removeToken();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}

export default new AuthService();
