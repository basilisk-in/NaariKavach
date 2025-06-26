import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:8001'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.listeners = new Map() // Track registered listeners for cleanup
  }

  // Initialize socket connection
  connect() {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected')
      return this.socket
    }

    try {
      this.socket = io(SOCKET_URL, {
        cors: {
          origin: "http://localhost:3000"
        },
        transports: ['websocket', 'polling']
      })

      // Set up connection event listeners
      this.socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server:', this.socket.id)
        this.isConnected = true
      })

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from Socket.IO server:', reason)
        this.isConnected = false
      })

      this.socket.on('connection_established', (data) => {
        console.log('🔗 Connection established:', data.message)
      })

      this.socket.on('room_joined', (data) => {
        console.log('🏠 Room joined:', data)
      })

      this.socket.on('error', (error) => {
        console.error('🚨 Socket.IO Error:', error)
      })

      return this.socket
    } catch (error) {
      console.error('Failed to connect to Socket.IO server:', error)
      return null
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      // Clean up all listeners
      this.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log('🔌 Socket disconnected')
    }
  }

  // Join SOS channel to receive new SOS alerts
  joinSOSChannel() {
    if (this.socket) {
      this.socket.emit('join_sos_channel', {})
      console.log('📢 Joining SOS channel')
    }
  }

  // Join specific SOS room for location updates
  joinSOSRoom(roomId) {
    if (this.socket && roomId) {
      this.socket.emit('join_sos_room', { room_id: roomId })
      console.log(`🏠 Joining SOS room: ${roomId}`)
    }
  }

  // Join officer tracking channel to receive police unit location updates
  joinOfficerTrackingChannel() {
    if (this.socket) {
      this.socket.emit('join_officer_update', {})
      console.log('🚔 Joining officer tracking channel')
    }
  }

  // Listen for new SOS alerts
  onNewSOS(callback) {
    if (this.socket) {
      // Remove existing listener if it exists to prevent duplicates
      if (this.listeners.has('new_sos')) {
        const oldCallback = this.listeners.get('new_sos')
        this.socket.off('new_sos', oldCallback)
        console.log('🧹 Removed existing new_sos listener')
      }
      
      this.socket.on('new_sos', callback)
      this.listeners.set('new_sos', callback)
      console.log('👂 Listening for new SOS alerts')
    }
  }

  // Listen for location history updates
  onLocationHistory(callback) {
    if (this.socket) {
      // Remove existing listener if it exists to prevent duplicates
      if (this.listeners.has('location_history')) {
        const oldCallback = this.listeners.get('location_history')
        this.socket.off('location_history', oldCallback)
        console.log('🧹 Removed existing location_history listener')
      }
      
      this.socket.on('location_history', callback)
      this.listeners.set('location_history', callback)
      console.log('📍 Listening for location updates')
    }
  }

  // Listen for police unit location updates
  onUnitLocation(callback) {
    if (this.socket) {
      // Remove existing listener if it exists to prevent duplicates
      if (this.listeners.has('unit_loc')) {
        const oldCallback = this.listeners.get('unit_loc')
        this.socket.off('unit_loc', oldCallback)
        console.log('🧹 Removed existing unit_loc listener')
      }
      
      this.socket.on('unit_loc', callback)
      this.listeners.set('unit_loc', callback)
      console.log('🚔 Listening for police unit location updates')
    }
  }

  // Remove specific event listener
  removeListener(eventName) {
    if (this.socket && this.listeners.has(eventName)) {
      const callback = this.listeners.get(eventName)
      this.socket.off(eventName, callback)
      this.listeners.delete(eventName)
      console.log(`🔇 Removed listener for: ${eventName}`)
    }
  }

  // Remove all event listeners
  removeAllListeners() {
    this.listeners.forEach((callback, eventName) => {
      if (this.socket) {
        this.socket.off(eventName, callback)
      }
    })
    this.listeners.clear()
    console.log('🔇 Removed all listeners')
  }

  // Remove unit location listener specifically
  removeUnitLocationListener() {
    this.removeListener('unit_loc')
    console.log('🚫 Removed police unit location listener')
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      connected: this.socket?.connected || false
    }
  }

  // Get socket instance (for advanced usage)
  getSocket() {
    return this.socket
  }
}

// Export singleton instance
export default new SocketService()