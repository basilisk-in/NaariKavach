import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { tokenManager, authApi, UserData } from '../services/services';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, re_password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setIsInitializing(true);
      const savedToken = await tokenManager.getToken();
      const savedUser = await tokenManager.getUserData();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
        setIsAuthenticated(true);
        
        // Add a delay to show splash screen for at least 3 seconds when auto-logging in
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authApi.login(username, password);
      
      if (response.success && response.data) {
        // Token is already saved by authApi.login
        const savedToken = await tokenManager.getToken();
        const savedUser = await tokenManager.getUserData();
        
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
          setIsAuthenticated(true);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, re_password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authApi.register(username, email, password, re_password);
      
      if (response.success) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentUser = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authApi.getCurrentUser();
      
      if (response.success && response.data) {
        setUser(response.data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Get current user error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authApi.logout();
      
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    token,
    isLoading,
    isInitializing,
    login,
    register,
    logout,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
