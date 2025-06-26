const API_BASE_URL = 'http://localhost:8000'

class AuthService {
  // Login user with username and password
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.non_field_errors?.[0] || 'Login failed')
      }

      return {
        success: true,
        token: data.auth_token,
        message: 'Login successful'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network error occurred'
      }
    }
  }

  // Get current user information
  async getCurrentUser(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/me/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      return {
        success: true,
        user: data
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user data'
      }
    }
  }

  // Logout user
  async logout(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
      })

      if (!response.ok) {
        // Even if logout fails on server, we'll clear local storage
        console.warn('Server logout failed, but clearing local session')
      }

      return {
        success: true,
        message: 'Logout successful'
      }
    } catch (error) {
      // Even if network fails, we'll clear local storage
      console.warn('Logout network error, but clearing local session:', error)
      return {
        success: true,
        message: 'Logout successful (local only)'
      }
    }
  }

  // Register new user (if needed)
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = Object.values(data).flat().join(', ')
        throw new Error(errorMessage || 'Registration failed')
      }

      return {
        success: true,
        user: data,
        message: 'Registration successful'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      }
    }
  }

  // Check if token is valid by making a test request
  async validateToken(token) {
    if (!token) return false
    
    const result = await this.getCurrentUser(token)
    return result.success
  }
}

export default new AuthService() 