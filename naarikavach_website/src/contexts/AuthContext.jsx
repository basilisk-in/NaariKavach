import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('naarikavach_token') || '')
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('naarikavach_token')
      
      if (storedToken) {
        try {
          const isValid = await authService.validateToken(storedToken)
          
          if (isValid) {
            const userResult = await authService.getCurrentUser(storedToken)
            if (userResult.success) {
              setUser(userResult.user)
              setToken(storedToken)
              setIsAuthenticated(true)
            } else {
              // Token invalid, clear it
              localStorage.removeItem('naarikavach_token')
              setToken('')
              setIsAuthenticated(false)
            }
          } else {
            // Token invalid, clear it
            localStorage.removeItem('naarikavach_token')
            setToken('')
            setIsAuthenticated(false)
          }
        } catch (error) {
          console.error('Error validating token:', error)
          localStorage.removeItem('naarikavach_token')
          setToken('')
          setIsAuthenticated(false)
        }
      }
      
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  // Login function
  const login = async (credentials) => {
    setIsLoading(true)
    
    try {
      const result = await authService.login(credentials)
      
      if (result.success) {
        // Get user data
        const userResult = await authService.getCurrentUser(result.token)
        
        if (userResult.success) {
          setUser(userResult.user)
          setToken(result.token)
          setIsAuthenticated(true)
          localStorage.setItem('naarikavach_token', result.token)
          
          // Navigate to dashboard
          navigate('/dashboard')
          
          return { success: true, message: 'Login successful' }
        } else {
          throw new Error('Failed to fetch user data')
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    setIsLoading(true)
    
    try {
      if (token) {
        await authService.logout(token)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear state regardless of server response
      setUser(null)
      setToken('')
      setIsAuthenticated(false)
      localStorage.removeItem('naarikavach_token')
      setIsLoading(false)
      
      // Navigate to landing page
      navigate('/')
    }
  }

  // Register function (if needed)
  const register = async (userData) => {
    setIsLoading(true)
    
    try {
      const result = await authService.register(userData)
      
      if (result.success) {
        return { success: true, message: 'Registration successful. Please login.' }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Get authenticated API headers
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` })
    }
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    getAuthHeaders
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
} 