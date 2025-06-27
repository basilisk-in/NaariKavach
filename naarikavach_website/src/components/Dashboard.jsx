import { useState, useCallback, useEffect } from 'react'
import {
  HiShieldCheck,
  HiSearch,
  HiLocationMarker,
  HiPlay,
  HiX,
  HiClock,
  HiExclamation,
  HiCheckCircle,
  HiUser,
  HiPhone,
  HiRefresh,
  HiMap,
  HiViewList,
  HiChevronDown,
  HiChevronRight,
  HiChevronLeft,
  HiLogout,
} from 'react-icons/hi'
import {APIProvider, Map, AdvancedMarker, Pin, InfoWindow} from '@vis.gl/react-google-maps'
import { useAuth } from '../contexts/AuthContext'
import socketService from '../services/socketService'

export function Dashboard() {
  const { user, logout, getAuthHeaders } = useAuth()
  const [activeTab, setActiveTab] = useState('table') // 'table' or 'map'
  const [activeMapTab, setActiveMapTab] = useState('global') // 'global' or sosId
  const [expandedRowId, setExpandedRowId] = useState(null) // Track which row is expanded
  const [subscribedRooms, setSubscribedRooms] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('Disconnected') // Connected/Disconnected
  const [isSocketConnected, setIsSocketConnected] = useState(false) // Socket connection status
  const [mapSelectedSOS, setMapSelectedSOS] = useState(null) // For map marker selection
  const [showInfoWindow, setShowInfoWindow] = useState(false)
  
  // Officer assignment state
  const [assignmentData, setAssignmentData] = useState({}) // Track input data per SOS
  const [assignmentLoading, setAssignmentLoading] = useState({}) // Track loading per SOS
  const [assignmentErrors, setAssignmentErrors] = useState({}) // Track errors per SOS
  
  // Resolve SOS state
  const [resolveLoading, setResolveLoading] = useState({}) // Track loading per SOS
  const [resolveErrors, setResolveErrors] = useState({}) // Track errors per SOS
  
  // Refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Police unit tracking state
  const [isTrackingUnits, setIsTrackingUnits] = useState(false)
  const [policeUnits, setPoliceUnits] = useState([]) // Array of {unit_id, latitude, longitude, timestamp}
  const [isSubscribedToOfficerChannel, setIsSubscribedToOfficerChannel] = useState(false)
  const [mapSelectedUnit, setMapSelectedUnit] = useState(null) // For unit marker selection
  const [showUnitInfoWindow, setShowUnitInfoWindow] = useState(false)
  
  // Placeholder for API key - replace with your actual key
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'
  const MAP_ID = import.meta.env.VITE_MAP_ID || 'YOUR_MAP_ID_HERE'
  
  // SOS requests state - starts empty, populated by real-time Socket.IO events
  const [sosRequests, setSosRequests] = useState([])
  
  // SOS Images state management
  const [sosImages, setSosImages] = useState({}) // {sosId: [image1, image2, ...]}
  const [imagesLoading, setImagesLoading] = useState({}) // {sosId: boolean}
  const [currentImageIndex, setCurrentImageIndex] = useState({}) // {sosId: number}
  const [imageErrors, setImageErrors] = useState({}) // {sosId: string}

  // Reusable function to fetch SOS data
  const fetchSOSData = async (isRefresh = false) => {
    const loadingText = isRefresh ? 'Refreshing' : 'Fetching existing'
    
    try {
      console.log(`📊 ${loadingText} SOS data from API...`)
      const response = await fetch('http://localhost:8000/api/sos/', {
        method: 'GET',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ${loadingText} SOS data:`, data)
        
        // Transform API data to match component state structure
        const transformedData = data.map(sos => ({
          id: sos.id,
          name: sos.name || 'Unknown',
          sos_type: sos.sos_type || 0,
          status_flag: sos.status_flag || 0,
          acknowledged_flag: sos.acknowledged_flag || 0,
          initial_latitude: sos.initial_latitude || 0,
          initial_longitude: sos.initial_longitude || 0,
          unit_number_dispatched: sos.unit_number_dispatched || null,
          room_id: sos.room_id,
          created_at: sos.created_at || new Date().toISOString(),
          last_location_update: isRefresh ? 'Just refreshed' : 'From database'
        }))
        
        setSosRequests(transformedData)
        console.log(`📋 ${isRefresh ? 'Refreshed' : 'Loaded'} ${transformedData.length} SOS requests`)
        
        if (isRefresh) {
          console.log('🔄 Dashboard data refreshed successfully')
        }
        
      } else if (response.status === 401) {
        console.error('❌ Authentication required. Please login first.')
        // Could redirect to login or show a message
      } else {
        console.error(`❌ Failed to ${loadingText.toLowerCase()} SOS data:`, response.statusText)
      }
    } catch (error) {
      console.error(`❌ Error ${loadingText.toLowerCase()} SOS data:`, error)
    }
  }

  // Refresh button handler
  const handleRefresh = async () => {
    console.log('🔄 Refresh button clicked')
    setIsRefreshing(true)
    
    try {
      await fetchSOSData(true)
      
      // Clear images cache and re-fetch images for currently expanded SOS
      console.log('🗑️ Clearing images cache...')
      setSosImages({})
      setCurrentImageIndex({})
      setImageErrors({})
      
      // Re-fetch images for expanded SOS if any
      if (expandedRowId) {
        console.log(`🔄 Re-fetching images for expanded SOS ${expandedRowId}...`)
        await fetchSOSImages(expandedRowId, true) // Force refresh
      }
      
    } finally {
      setIsRefreshing(false)
    }
  }

  // Function to fetch SOS images
  const fetchSOSImages = async (sosId, forceRefresh = false) => {
    // Don't fetch if already loading or already have images (unless forcing refresh)
    if (!forceRefresh && (imagesLoading[sosId] || sosImages[sosId])) {
      return
    }

    console.log(`📸 Fetching images for SOS ${sosId}...`)
    setImagesLoading(prev => ({ ...prev, [sosId]: true }))
    setImageErrors(prev => ({ ...prev, [sosId]: null }))

    try {
      const response = await fetch(`http://localhost:8000/api/get-sos-images/${sosId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: This endpoint doesn't require auth based on API guide
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Images fetched for SOS ${sosId}:`, data)
        
        if (data.status === 'success' && data.images) {
          // Store images and initialize current index to 0
          setSosImages(prev => ({ ...prev, [sosId]: data.images }))
          setCurrentImageIndex(prev => ({ ...prev, [sosId]: 0 }))
          console.log(`📋 Loaded ${data.images.length} image(s) for SOS ${sosId}`)
        } else {
          // No images found
          setSosImages(prev => ({ ...prev, [sosId]: [] }))
          console.log(`📭 No images found for SOS ${sosId}`)
        }
      } else if (response.status === 404) {
        // SOS not found or no images
        setSosImages(prev => ({ ...prev, [sosId]: [] }))
        console.log(`📭 No images found for SOS ${sosId} (404)`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error(`❌ Error fetching images for SOS ${sosId}:`, error)
      setImageErrors(prev => ({ 
        ...prev, 
        [sosId]: `Failed to load images: ${error.message}` 
      }))
    } finally {
      setImagesLoading(prev => ({ ...prev, [sosId]: false }))
    }
  }

  // Fetch existing SOS data on component mount
  useEffect(() => {
    // Fetch existing data first
    fetchSOSData(false)
  }, []) // Empty dependency array - run once on mount

  // Fetch images when a row is expanded
  useEffect(() => {
    if (expandedRowId && !sosImages[expandedRowId] && !imagesLoading[expandedRowId]) {
      fetchSOSImages(expandedRowId)
    }
  }, [expandedRowId]) // Dependency on expandedRowId

  // Socket.IO Integration - Following React Socket.IO best practices
  useEffect(() => {
    console.log('🚀 Setting up Socket.IO connection...')
    
    // Connect to Socket.IO server
    const socket = socketService.connect()
    
    if (socket) {
      // Update connection status based on socket events
      const updateConnectionStatus = () => {
        const status = socketService.getConnectionStatus()
        setIsSocketConnected(status.isConnected)
        setConnectionStatus(status.isConnected ? 'Connected' : 'Disconnected')
      }

      // Initial status update
      updateConnectionStatus()
      
      // Join main SOS channel to receive new SOS alerts
      socketService.joinSOSChannel()

      // Handler for new SOS alerts
      const handleNewSOS = (data) => {
        console.log('🚨 New SOS received:', data)
        
        // Check if SOS already exists to avoid duplicates
        setSosRequests(prev => {
          const existingSOS = prev.find(sos => sos.id === data.sos_id)
          if (existingSOS) {
            console.log('🔄 SOS already exists, skipping duplicate')
            return prev
          }
          
          // Add new SOS to the top of the list
          const newSOS = {
            id: data.sos_id,
            name: data.name || 'Unknown',
            sos_type: data.sos_type || 0,
            status_flag: 0, // New SOS is always unresolved
            acknowledged_flag: 0, // New SOS is not acknowledged
            initial_latitude: data.latitude || 0,
            initial_longitude: data.longitude || 0,
            unit_number_dispatched: null,
            room_id: data.room_id,
            created_at: data.created_at || new Date().toISOString(),
            last_location_update: 'Just now'
          }
          
          console.log('📋 New SOS added to list. Click Subscribe to track location updates.')
          return [newSOS, ...prev]
        })
      }

      // Handler for location updates
      const handleLocationHistory = (data) => {
        console.log('📍 Location update received:', data)
        console.log('🏠 Currently subscribed rooms:', subscribedRooms)
        console.log('🔍 Is this SOS subscribed?', subscribedRooms.some(room => room.includes(data.sos_id?.toString())))
        console.log('👂 Number of location_history listeners:', 
          socketService.getSocket()?.listeners('location_history').length || 'socket not available')
        
        // Update the specific SOS with new location data
        setSosRequests(prev => prev.map(sos => {
          if (sos.id === data.sos_id) {
            return {
              ...sos,
              initial_latitude: data.latitude,
              initial_longitude: data.longitude,
              last_location_update: 'Just now'
            }
          }
          return sos
        }))
      }

      // Register event listeners
      console.log('🔧 Registering Socket.IO event listeners...')
      socketService.onNewSOS(handleNewSOS)
      socketService.onLocationHistory(handleLocationHistory)
      
      // Register unit location listener if tracking is enabled
      if (isTrackingUnits) {
        console.log('🚔 Registering police unit location listener...')
        socketService.onUnitLocation(handleUnitLocationUpdate)
      }
      
      // Debug: Check listener counts after registration
      setTimeout(() => {
        const socket = socketService.getSocket()
        if (socket) {
          console.log('👂 Final listener counts:')
          console.log('  - new_sos listeners:', socket.listeners('new_sos').length)
          console.log('  - location_history listeners:', socket.listeners('location_history').length)
          // Note: eventNames() is not available on Socket.IO client
        }
      }, 100)

      // Monitor connection status changes
      const connectionCheckInterval = setInterval(updateConnectionStatus, 5000)

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up Socket.IO connections...')
        clearInterval(connectionCheckInterval)
        socketService.removeAllListeners()
        socketService.disconnect()
      }
    }
  }, []) // Empty dependency array - setup once on mount

  // Separate useEffect for unit tracking lifecycle
  useEffect(() => {
    if (isTrackingUnits && socketService.getSocket()) {
      console.log('🚔 Setting up police unit location listener...')
      socketService.onUnitLocation(handleUnitLocationUpdate)
      
      return () => {
        console.log('🧹 Cleaning up police unit location listener...')
        socketService.removeUnitLocationListener()
      }
    }
  }, [isTrackingUnits]) // Dependency on tracking state

  const getStatusColor = (sos) => {
    if (sos.status_flag === 1) return 'text-green-600' // Resolved
    return 'text-red-600' // Unresolved
  }

  const getStatusText = (sos) => {
    if (sos.status_flag === 1) return 'Resolved'
    return 'Unresolved'
  }

  const getTypeText = (type) => {
    return type === 0 ? 'Emergency' : 'Alert'
  }

  const getMarkerColor = (sos) => {
    if (sos.status_flag === 1) return '#10b981' // Green for resolved
    if (sos.acknowledged_flag === 1) return '#f59e0b' // Yellow for acknowledged
    return '#ef4444' // Red for unresolved
  }

  const handleSubscribeRoom = (sosId, roomId) => {
    if (!subscribedRooms.includes(roomId)) {
      // Subscribe to room (permanent subscription)
      socketService.joinSOSRoom(roomId)
      setSubscribedRooms([...subscribedRooms, roomId])
      console.log(`🏠 Permanently subscribed to room: ${roomId}`)
    }
  }

  const handleAcknowledgeToggle = (sosId) => {
    // Update the SOS acknowledgement status in state
    setSosRequests(prevSosRequests => 
      prevSosRequests.map(sos => 
        sos.id === sosId 
          ? { ...sos, acknowledged_flag: sos.acknowledged_flag === 1 ? 0 : 1 }
          : sos
      )
    )
    
    // In a real app, this would also make an API call to update the backend
    console.log(`Toggling acknowledgement for SOS ${sosId}`)
  }

  const handleRowClick = (sos) => {
    // Toggle expanded state
    if (expandedRowId === sos.id) {
      setExpandedRowId(null)
    } else {
      setExpandedRowId(sos.id)
    }
  }

  // Map click handler following Google Maps React patterns
  const handleMarkerClick = useCallback((sos) => {
    setMapSelectedSOS(sos)
    setShowInfoWindow(true)
  }, [])

  const handleMapClick = useCallback(() => {
    setShowInfoWindow(false)
    setMapSelectedSOS(null)
    setShowUnitInfoWindow(false)
    setMapSelectedUnit(null)
  }, [])

  // Get filtered SOS requests based on active map tab
  const getFilteredSOSRequests = () => {
    if (activeMapTab === 'global') {
      return sosRequests
    }
    // Filter by specific SOS ID
    return sosRequests.filter(sos => sos.id.toString() === activeMapTab)
  }

  // Get subscribed SOS requests (for creating tabs)
  const getSubscribedSOSRequests = () => {
    return sosRequests.filter(sos => subscribedRooms.includes(sos.room_id))
  }

  // Handle map tab change
  const handleMapTabChange = (tabId) => {
    setActiveMapTab(tabId)
    setShowInfoWindow(false)
    setMapSelectedSOS(null)
  }

  // Police unit tracking handlers
  const handleToggleUnitTracking = async () => {
    if (!isTrackingUnits) {
      // Start tracking
      console.log('🚔 Starting police unit tracking...')
      setIsTrackingUnits(true)
      socketService.joinOfficerTrackingChannel()
      setIsSubscribedToOfficerChannel(true)
      console.log('✅ Police unit tracking started')
    } else {
      // Stop tracking
      console.log('🛑 Stopping police unit tracking...')
      setIsTrackingUnits(false)
      setPoliceUnits([]) // Clear existing units
      setIsSubscribedToOfficerChannel(false)
      socketService.removeUnitLocationListener()
      setMapSelectedUnit(null)
      setShowUnitInfoWindow(false)
      console.log('✅ Police unit tracking stopped')
    }
  }

  const handleUnitLocationUpdate = (data) => {
    console.log('🚔 Police unit location update received:', data)
    
    // Validate data structure
    if (!data.unit_id || !data.latitude || !data.longitude) {
      console.warn('⚠️ Invalid unit location data:', data)
      return
    }
    
    setPoliceUnits(prevUnits => {
      const existingUnitIndex = prevUnits.findIndex(unit => unit.unit_id === data.unit_id)
      
      if (existingUnitIndex >= 0) {
        // Update existing unit
        console.log(`🔄 Updating existing unit: ${data.unit_id}`)
        const updatedUnits = [...prevUnits]
        updatedUnits[existingUnitIndex] = {
          unit_id: data.unit_id,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString()
        }
        return updatedUnits
      } else {
        // Add new unit
        console.log(`➕ Adding new unit: ${data.unit_id}`)
        const newUnit = {
          unit_id: data.unit_id,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString()
        }
        return [...prevUnits, newUnit]
      }
    })
  }

  // Unit marker click handler
  const handleUnitMarkerClick = useCallback((unit) => {
    console.log('🚔 Unit marker clicked:', unit.unit_id)
    setMapSelectedUnit(unit)
    setShowUnitInfoWindow(true)
    // Close SOS info window if open
    setShowInfoWindow(false)
    setMapSelectedSOS(null)
  }, [])

  // Image carousel navigation handlers
  const handlePreviousImage = (sosId) => {
    const images = sosImages[sosId] || []
    if (images.length <= 1) return
    
    setCurrentImageIndex(prev => {
      const currentIndex = prev[sosId] || 0
      const newIndex = currentIndex - 1
      return {
        ...prev,
        [sosId]: newIndex < 0 ? images.length - 1 : newIndex
      }
    })
  }

  const handleNextImage = (sosId) => {
    const images = sosImages[sosId] || []
    if (images.length <= 1) return
    
    setCurrentImageIndex(prev => {
      const currentIndex = prev[sosId] || 0
      const newIndex = currentIndex + 1
      return {
        ...prev,
        [sosId]: newIndex >= images.length ? 0 : newIndex
      }
    })
  }

  // Officer assignment input handler
  const handleAssignmentInputChange = (sosId, field, value) => {
    setAssignmentData(prev => ({
      ...prev,
      [sosId]: {
        ...prev[sosId],
        [field]: value
      }
    }))
    
    // Clear error when user starts typing
    if (assignmentErrors[sosId]) {
      setAssignmentErrors(prev => ({
        ...prev,
        [sosId]: null
      }))
    }
  }

  // Main officer assignment handler
  const handleAssignOfficer = async (sosId) => {
    const assignmentInfo = assignmentData[sosId]
    
    // Validation
    if (!assignmentInfo?.officer_name?.trim() || !assignmentInfo?.unit_number?.trim()) {
      setAssignmentErrors(prev => ({
        ...prev,
        [sosId]: 'Both Officer Name and Unit Number are required'
      }))
      return
    }

    // Set loading state
    setAssignmentLoading(prev => ({ ...prev, [sosId]: true }))
    setAssignmentErrors(prev => ({ ...prev, [sosId]: null }))

    try {
      console.log(`🚔 Assigning officer to SOS ${sosId}...`)
      
      const response = await fetch('http://localhost:8000/api/assign-officer/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          sos_request: sosId,
          officer_name: assignmentInfo.officer_name.trim(),
          unit_number: assignmentInfo.unit_number.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Officer assigned successfully:', data)
        
        // Update SOS in state with assignment info
        setSosRequests(prev => prev.map(sos => {
          if (sos.id === sosId) {
            return {
              ...sos,
              unit_number_dispatched: assignmentInfo.unit_number.trim(),
              acknowledged_flag: 1 // Backend automatically sets this
            }
          }
          return sos
        }))

        // Clear assignment form data
        setAssignmentData(prev => ({
          ...prev,
          [sosId]: { officer_name: '', unit_number: '' }
        }))

        console.log(`🎉 Officer ${assignmentInfo.officer_name} (${assignmentInfo.unit_number}) assigned to SOS ${sosId}`)
        
      } else if (response.status === 401) {
        setAssignmentErrors(prev => ({
          ...prev,
          [sosId]: 'Authentication required. Please login again.'
        }))
      } else if (response.status === 400) {
        const errorData = await response.json()
        setAssignmentErrors(prev => ({
          ...prev,
          [sosId]: `Validation error: ${JSON.stringify(errorData)}`
        }))
      } else {
        setAssignmentErrors(prev => ({
          ...prev,
          [sosId]: `Failed to assign officer: ${response.statusText}`
        }))
      }
    } catch (error) {
      console.error('❌ Error assigning officer:', error)
      setAssignmentErrors(prev => ({
        ...prev,
        [sosId]: `Network error: ${error.message}`
      }))
         } finally {
       setAssignmentLoading(prev => ({ ...prev, [sosId]: false }))
     }
   }

   // Main resolve SOS handler
   const handleResolveSOS = async (sosId) => {
     console.log(`🚩 Starting resolve process for SOS ${sosId}...`)
     
     // Set loading state
     setResolveLoading(prev => ({ ...prev, [sosId]: true }))
     setResolveErrors(prev => ({ ...prev, [sosId]: null }))

     try {
       console.log(`📤 Making POST request to resolve SOS ${sosId}...`)
       
       const response = await fetch(`http://localhost:8000/api/resolve-sos/${sosId}/`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         }
         // No body needed for resolve endpoint
       })

       console.log(`📥 Response received:`, {
         status: response.status,
         statusText: response.statusText,
         ok: response.ok
       })

       if (response.ok) {
         const data = await response.json()
         console.log('✅ SOS resolved successfully:', data)
         
         // Update SOS in state to mark as resolved
         setSosRequests(prev => prev.map(sos => {
           if (sos.id === sosId) {
             console.log(`🔄 Updating SOS ${sosId} status_flag from ${sos.status_flag} to 1`)
             return {
               ...sos,
               status_flag: 1 // Mark as resolved
             }
           }
           return sos
         }))

         console.log(`🎉 SOS ${sosId} has been successfully resolved and UI updated`)
         
       } else if (response.status === 401) {
         const errorMsg = 'Authentication required. Please login again.'
         console.error('❌ Authentication error:', errorMsg)
         setResolveErrors(prev => ({
           ...prev,
           [sosId]: errorMsg
         }))
       } else if (response.status === 404) {
         const errorMsg = 'SOS not found. It may have been deleted.'
         console.error('❌ Not found error:', errorMsg)
         setResolveErrors(prev => ({
           ...prev,
           [sosId]: errorMsg
         }))
       } else if (response.status === 403) {
         const errorMsg = 'Permission denied. You are not authorized to resolve this SOS.'
         console.error('❌ Permission error:', errorMsg)
         setResolveErrors(prev => ({
           ...prev,
           [sosId]: errorMsg
         }))
       } else {
         const errorMsg = `Failed to resolve SOS: ${response.statusText}`
         console.error('❌ HTTP error:', errorMsg)
         setResolveErrors(prev => ({
           ...prev,
           [sosId]: errorMsg
         }))
       }
     } catch (error) {
       console.error('❌ Network error resolving SOS:', error)
       const errorMsg = `Network error: ${error.message}`
       setResolveErrors(prev => ({
         ...prev,
         [sosId]: errorMsg
       }))
     } finally {
       setResolveLoading(prev => ({ ...prev, [sosId]: false }))
       console.log(`🏁 Resolve process completed for SOS ${sosId}`)
     }
   }

  // Calculate map center based on filtered SOS locations
  const filteredSOSRequests = getFilteredSOSRequests()
  const mapCenter = filteredSOSRequests.length > 0 ? {
    lat: filteredSOSRequests.reduce((sum, sos) => sum + sos.initial_latitude, 0) / filteredSOSRequests.length,
    lng: filteredSOSRequests.reduce((sum, sos) => sum + sos.initial_longitude, 0) / filteredSOSRequests.length
  } : {
    lat: 28.7041, // Default to Delhi, India
    lng: 77.1025
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="min-h-screen bg-gray-100 text-gray-800">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <HiShieldCheck className="w-6 h-6 text-gray-800" />
              <h1 className="text-lg font-bold text-gray-800">NAARIKAVACH ADMIN</h1>
            </div>

            {/* Browser-style Tab Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-end border-b border-gray-300 gap-1" role="tablist" aria-orientation="horizontal">
                <button
                  onClick={() => setActiveTab('table')}
                  role="tab"
                  aria-selected={activeTab === 'table'}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative ${
                    activeTab === 'table'
                      ? 'bg-white text-white border-t border-l border-r border-gray-300 rounded-t-lg -mb-px z-10'
                      : 'bg-gray-100 text-gray-200 hover:bg-gray-200 hover:text-gray-300 border-t border-l border-r border-transparent rounded-t-lg mb-0'
                  }`}
                >
                  <HiViewList className="w-4 h-4" />
                  Table View
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  role="tab" 
                  aria-selected={activeTab === 'map'}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative ${
                    activeTab === 'map'
                      ? 'bg-white text-white border-t border-l border-r border-gray-300 rounded-t-lg -mb-px z-10'
                      : 'bg-gray-100 text-gray-200 hover:bg-gray-200 hover:text-gray-300 border-t border-l border-r border-transparent rounded-t-lg mb-0'
                  }`}
                >
                  <HiMap className="w-4 h-4" />
                  Map View
                </button>
              </div>
            </div>

                        {/* Connection Status & Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  Socket.IO {connectionStatus}
                  {isSocketConnected && (
                    <span className="text-xs text-gray-500 ml-1">
                      (Real-time)
                    </span>
                  )}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Subscribed Rooms: </span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{subscribedRooms.length}</span>
              </div>
              {isTrackingUnits && (
                <div className="text-sm">
                  <span className="font-medium">Police Units: </span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{policeUnits.length}</span>
                </div>
              )}
              
              {/* User info and logout */}
              <div className="flex items-center gap-3">
                <div className="text-sm text-right">
                  <p className="font-medium text-gray-900">{user?.username || 'Admin'}</p>
                  <p className="text-gray-500">{user?.email || 'admin@naarikavach.com'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <HiUser className="w-4 h-4 text-gray-600" />
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <HiLogout className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
          </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-73px)] border-t border-gray-300 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Room Subscriptions</h3>
            
            {/* Subscribed Rooms */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Currently Subscribed ({subscribedRooms.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {subscribedRooms.length === 0 ? (
                  <p className="text-sm text-gray-500">No rooms subscribed</p>
                ) : (
                  subscribedRooms.map(roomId => (
                    <div key={roomId} className="bg-blue-50 p-2 rounded text-sm">
                      <span className="font-mono">{roomId.split('-')[1]}</span>
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="bg-red-50 p-3 rounded">
                <div className="text-sm text-red-600 font-medium">Active Emergencies</div>
                <div className="text-2xl font-bold text-red-700">
                  {sosRequests.filter(s => s.sos_type === 0 && s.status_flag === 0).length}
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="text-sm text-yellow-600 font-medium">Acknowledged</div>
                <div className="text-2xl font-bold text-yellow-700">
                  {sosRequests.filter(s => s.acknowledged_flag === 1 && s.status_flag === 0).length}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-green-600 font-medium">Resolved Today</div>
                <div className="text-2xl font-bold text-green-700">
                  {sosRequests.filter(s => s.status_flag === 1).length}
                </div>
              </div>
              {isTrackingUnits && (
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-blue-600 font-medium">Police Units</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {policeUnits.length}
                  </div>
                </div>
              )}
            </div>

            {/* Map Legend (only show in map view) */}
            {activeTab === 'map' && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Map Legend</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Unresolved Emergency/Alert</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Acknowledged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Resolved</span>
                  </div>
                  {isTrackingUnits && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Police Units ({policeUnits.length})</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'table' && (
              <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">Active SOS Requests</h2>
                      <div className="flex items-center gap-3">
                        {/* Track All Units Button */}
                        <button 
                          onClick={handleToggleUnitTracking}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                            isTrackingUnits
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isTrackingUnits ? (
                            <>
                              <HiX className="w-4 h-4" />
                              Stop Tracking Units
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse ml-1"></div>
                            </>
                          ) : (
                            <>
                              <HiLocationMarker className="w-4 h-4" />
                              Track All Units
                            </>
                          )}
                        </button>
                        
                        {/* Unit count indicator */}
                        {isTrackingUnits && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span className="font-medium">Units:</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                              {policeUnits.length}
                            </span>
                          </div>
                        )}
                        
                        {/* Refresh Button */}
                        <button 
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                            isRefreshing
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <HiRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-8"></th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Acknowledged</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unit</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sosRequests.map((sos) => (
                          <>
                            {/* Main SOS Row */}
                            <tr 
                              key={sos.id}
                              className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                                expandedRowId === sos.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleRowClick(sos)}
                            >
                              <td className="px-4 py-3 text-sm">
                                {expandedRowId === sos.id ? (
                                  <HiChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <HiChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono">{sos.id}</td>
                              <td className="px-4 py-3 text-sm font-medium">{sos.name}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  sos.sos_type === 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {getTypeText(sos.sos_type)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`font-medium ${getStatusColor(sos)}`}>
                                  {getStatusText(sos)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={sos.acknowledged_flag === 1}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleAcknowledgeToggle(sos.id)
                                  }}
                                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer accent-green-600"
                                  title={sos.acknowledged_flag === 1 ? 'Click to unacknowledge' : 'Click to acknowledge'}
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-mono">
                                {sos.unit_number_dispatched || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(sos.created_at).toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSubscribeRoom(sos.id, sos.room_id)
                                  }}
                                  disabled={subscribedRooms.includes(sos.room_id)}
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    subscribedRooms.includes(sos.room_id)
                                      ? 'bg-green-100 text-green-300 cursor-not-allowed'
                                      : 'bg-gray-100 text-white hover:bg-gray-200 cursor-pointer'
                                  }`}
                                >
                                  {subscribedRooms.includes(sos.room_id) ? 'Subscribed ✓' : 'Subscribe'}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Details Row */}
                            {expandedRowId === sos.id && (
                              <tr>
                                <td colSpan="9" className="px-0 py-0">
                                  <div className="bg-gray-50 border-t border-gray-200 animate-in slide-in-from-top duration-200">
                                    <div className="p-6">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                          SOS Details (ID: {sos.id})
                                        </h3>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setExpandedRowId(null)
                                          }}
                                          className="text-gray-400 hover:text-gray-600"
                                        >
                                          <HiX className="w-5 h-5" />
                                        </button>
                                      </div>
                                      
                                      <div className="flex gap-6">
                                        {/* SOS Info */}
                                        <div className="flex-1">
                                          <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                              <label className="text-sm font-medium text-gray-700">Name</label>
                                              <p className="text-sm text-gray-900">{sos.name}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700">Type</label>
                                              <p className="text-sm text-gray-900">{getTypeText(sos.sos_type)}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700">Status</label>
                                              <p className={`text-sm font-medium ${getStatusColor(sos)}`}>
                                                {getStatusText(sos)}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700">Acknowledged</label>
                                                                                             <div className="flex items-center gap-2">
                                                 <input
                                                   type="checkbox"
                                                   checked={sos.acknowledged_flag === 1}
                                                   onChange={(e) => {
                                                     e.stopPropagation()
                                                     handleAcknowledgeToggle(sos.id)
                                                   }}
                                                   className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer accent-green-600"
                                                 />
                                                 <span className="text-sm text-gray-900">
                                                   {sos.acknowledged_flag === 1 ? 'Yes' : 'No'}
                                                 </span>
                                               </div>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700">Room ID</label>
                                              <p className="text-sm font-mono text-gray-900">{sos.room_id.split('-')[1]}</p>
                                            </div>
                                          </div>

                                          {/* Location Updates */}
                                          <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Location Updates</h4>
                                            <div className="space-y-2 max-h-24 overflow-y-auto bg-white p-3 rounded border">
                                              <div className="text-sm">
                                                <span className="font-mono">
                                                  {sos.initial_latitude.toFixed(4)}, {sos.initial_longitude.toFixed(4)}
                                                </span>
                                                <span className="text-gray-500 ml-2">({sos.last_location_update})</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Images Section */}
                                          <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="text-sm font-medium text-gray-700">Images</h4>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  // Clear images for this SOS and re-fetch
                                                  setSosImages(prev => {
                                                    const updated = {...prev}
                                                    delete updated[sos.id]
                                                    return updated
                                                  })
                                                  setCurrentImageIndex(prev => {
                                                    const updated = {...prev}
                                                    delete updated[sos.id]
                                                    return updated
                                                  })
                                                  setImageErrors(prev => {
                                                    const updated = {...prev}
                                                    delete updated[sos.id]
                                                    return updated
                                                  })
                                                  fetchSOSImages(sos.id, true)
                                                }}
                                                disabled={imagesLoading[sos.id]}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                                  imagesLoading[sos.id]
                                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                                title="Refresh images for this SOS"
                                              >
                                                <HiRefresh className={`w-3 h-3 ${imagesLoading[sos.id] ? 'animate-spin' : ''}`} />
                                                {imagesLoading[sos.id] ? 'Loading...' : 'Refresh'}
                                              </button>
                                            </div>
                                            <div className="bg-white p-3 rounded border">
                                              {imagesLoading[sos.id] ? (
                                                // Loading state
                                                <div className="flex items-center justify-center py-8">
                                                  <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-sm text-gray-500">Loading images...</span>
                                                  </div>
                                                </div>
                                              ) : imageErrors[sos.id] ? (
                                                // Error state
                                                <div className="flex items-center justify-center py-8">
                                                  <div className="text-center">
                                                    <div className="text-red-600 text-sm mb-2">Failed to load images</div>
                                                    <div className="text-xs text-gray-500">{imageErrors[sos.id]}</div>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        fetchSOSImages(sos.id)
                                                      }}
                                                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                    >
                                                      Retry
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : sosImages[sos.id] && sosImages[sos.id].length > 0 ? (
                                                // Images available - show carousel
                                                (() => {
                                                  const images = sosImages[sos.id]
                                                  const currentIndex = currentImageIndex[sos.id] || 0
                                                  const currentImage = images[currentIndex]
                                                  
                                                  return (
                                                    <div className="space-y-3">
                                                      {/* Image Display */}
                                                      <div className="relative">
                                                        <img
                                                          src={currentImage.image_url}
                                                          alt={currentImage.description || `SOS Evidence ${currentIndex + 1}`}
                                                          className="w-full max-w-md h-48 object-cover rounded border mx-auto block"
                                                          onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyOEMyNC40MTgzIDI4IDI4IDI0LjQxODMgMjggMjBDMjggMTUuNTgxNyAyNC40MTgzIDEyIDIwIDEyQzE1LjU4MTcgMTIgMTIgMTUuNTgxNyAxMiAyMEMxMiAyNC40MTgzIDE1LjU4MTcgMjggMjAgMjhaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K'
                                                            e.target.alt = 'Failed to load image'
                                                          }}
                                                        />
                                                        
                                                        {/* Navigation arrows overlay (only show if multiple images) */}
                                                        {images.length > 1 && (
                                                          <>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                handlePreviousImage(sos.id)
                                                              }}
                                                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                                                              title="Previous image"
                                                            >
                                                              <HiChevronLeft className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleNextImage(sos.id)
                                                              }}
                                                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                                                              title="Next image"
                                                            >
                                                              <HiChevronRight className="w-4 h-4" />
                                                            </button>
                                                          </>
                                                        )}
                                                      </div>
                                                      
                                                      {/* Image Info */}
                                                      <div className="text-center space-y-1">
                                                        {currentImage.description && (
                                                          <p className="text-sm text-gray-700 font-medium">
                                                            {currentImage.description}
                                                          </p>
                                                        )}
                                                        <p className="text-xs text-gray-500">
                                                          Uploaded: {new Date(currentImage.uploaded_at).toLocaleString()}
                                                        </p>
                                                        {images.length > 1 && (
                                                          <p className="text-xs text-gray-500">
                                                            Image {currentIndex + 1} of {images.length}
                                                          </p>
                                                        )}
                                                      </div>
                                                      
                                                      {/* Navigation buttons (only show if multiple images) */}
                                                      {images.length > 1 && (
                                                        <div className="flex justify-center gap-2">
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              handlePreviousImage(sos.id)
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-white text-xs rounded hover:bg-gray-200 transition-colors"
                                                          >
                                                            <HiChevronLeft className="w-3 h-3" />
                                                            Previous
                                                          </button>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              handleNextImage(sos.id)
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-white text-xs rounded hover:bg-gray-200 transition-colors"
                                                          >
                                                            Next
                                                            <HiChevronRight className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )
                                                })()
                                              ) : (
                                                // No images state
                                                <div className="flex items-center justify-center py-8">
                                                  <div className="text-center">
                                                    <div className="text-gray-500 text-sm mb-2">No images uploaded</div>
                                                    <div className="text-xs text-gray-400">Images will appear here when uploaded</div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="w-80">
                                          {/* Officer Assignment */}
                                          <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Officer Assignment</h4>
                                            {sos.unit_number_dispatched ? (
                                              <div className="bg-green-50 p-3 rounded border border-green-200">
                                                <p className="text-sm text-green-800">
                                                  <span className="font-medium">Unit:</span> {sos.unit_number_dispatched}
                                                </p>
                                                <p className="text-xs text-green-600 mt-1">Officer assigned successfully</p>
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                <input
                                                  type="text"
                                                  placeholder="Officer Name"
                                                  value={assignmentData[sos.id]?.officer_name || ''}
                                                  onChange={(e) => handleAssignmentInputChange(sos.id, 'officer_name', e.target.value)}
                                                  disabled={assignmentLoading[sos.id]}
                                                  className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                    assignmentErrors[sos.id] ? 'border-red-300' : 'border-gray-300'
                                                  } ${assignmentLoading[sos.id] ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="Unit Number (e.g., UNIT001)"
                                                  value={assignmentData[sos.id]?.unit_number || ''}
                                                  onChange={(e) => handleAssignmentInputChange(sos.id, 'unit_number', e.target.value)}
                                                  disabled={assignmentLoading[sos.id]}
                                                  className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                    assignmentErrors[sos.id] ? 'border-red-300' : 'border-gray-300'
                                                  } ${assignmentLoading[sos.id] ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                                
                                                {/* Error message */}
                                                {assignmentErrors[sos.id] && (
                                                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                                    {assignmentErrors[sos.id]}
                                                  </div>
                                                )}
                                                
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleAssignOfficer(sos.id)
                                                  }}
                                                  disabled={assignmentLoading[sos.id]}
                                                  className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                                                    assignmentLoading[sos.id]
                                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                                  }`}
                                                >
                                                  {assignmentLoading[sos.id] ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                      Assigning...
                                                    </div>
                                                  ) : (
                                                    'Assign Officer'
                                                  )}
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Quick Actions */}
                                          <div className="space-y-2">
                                            {sos.status_flag === 0 && (
                                              <div>
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleResolveSOS(sos.id)
                                                  }}
                                                  disabled={resolveLoading[sos.id]}
                                                  className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                                                    resolveLoading[sos.id]
                                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                                      : 'bg-green-600 text-white hover:bg-green-700'
                                                  }`}
                                                >
                                                  {resolveLoading[sos.id] ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                      Resolving...
                                                    </div>
                                                  ) : (
                                                    'Mark as Resolved'
                                                  )}
                                                </button>
                                                
                                                {/* Error message */}
                                                {resolveErrors[sos.id] && (
                                                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                                                    {resolveErrors[sos.id]}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleSubscribeRoom(sos.id, sos.room_id)
                                              }}
                                              disabled={subscribedRooms.includes(sos.room_id)}
                                              className={`w-full px-3 py-2 rounded text-sm ${
                                                subscribedRooms.includes(sos.room_id)
                                                  ? 'bg-green-100 text-green-300 cursor-not-allowed'
                                                  : 'bg-blue-100 text-white hover:bg-blue-200 cursor-pointer'
                                              }`}
                                            >
                                              {subscribedRooms.includes(sos.room_id) ? 'Subscribed ✓' : 'Subscribe to Room'}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'map' && (
              <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-white rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">Live SOS Location Map</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {filteredSOSRequests.filter(s => s.status_flag === 0).length} Active SOS
                        </span>
                        <button 
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                            isRefreshing
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <HiRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Map Tab Navigation */}
                    <div className="mt-4">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {/* Global Tab */}
                        <button
                          onClick={() => handleMapTabChange('global')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            activeMapTab === 'global'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          <HiMap className="w-4 h-4" />
                          All SOS ({sosRequests.length})
                        </button>
                        
                        {/* Individual Room Tabs */}
                        {getSubscribedSOSRequests().map((sos) => (
                          <button
                            key={sos.id}
                            onClick={() => handleMapTabChange(sos.id.toString())}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                              activeMapTab === sos.id.toString()
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full ${
                              sos.status_flag === 1 ? 'bg-green-500' : 
                              sos.acknowledged_flag === 1 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            SOS #{sos.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <Map
                      mapId={MAP_ID}
                      defaultCenter={mapCenter}
                      defaultZoom={12}
                      gestureHandling={'greedy'}
                      disableDefaultUI={false}
                      onClick={handleMapClick}
                      style={{ width: '100%', height: '100%' }}
                    >
                      {/* SOS Markers */}
                      {filteredSOSRequests.map((sos) => (
                        <AdvancedMarker
                          key={sos.id}
                          position={{ lat: sos.initial_latitude, lng: sos.initial_longitude }}
                          clickable={true}
                          onClick={() => handleMarkerClick(sos)}
                        >
                          <Pin
                            background={getMarkerColor(sos)}
                            borderColor={'#ffffff'}
                            glyphColor={'#ffffff'}
                            scale={sos.sos_type === 0 ? 1.2 : 1.0} // Larger for emergencies
                          />
                        </AdvancedMarker>
                      ))}

                      {/* Police Unit Markers */}
                      {isTrackingUnits && policeUnits.map((unit) => (
                        <AdvancedMarker
                          key={`unit-${unit.unit_id}`}
                          position={{ lat: unit.latitude, lng: unit.longitude }}
                          clickable={true}
                          onClick={() => handleUnitMarkerClick(unit)}
                        >
                          <Pin
                            background={'#3b82f6'} // Blue color for police units
                            borderColor={'#ffffff'}
                            glyphColor={'#ffffff'}
                            scale={1.0}
                          />
                        </AdvancedMarker>
                      ))}

                      {/* Info Window for selected marker */}
                      {showInfoWindow && mapSelectedSOS && (
                        <InfoWindow
                          position={{ 
                            lat: mapSelectedSOS.initial_latitude, 
                            lng: mapSelectedSOS.initial_longitude 
                          }}
                          onCloseClick={() => setShowInfoWindow(false)}
                        >
                          <div className="p-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              SOS #{mapSelectedSOS.id}
                            </h3>
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Name:</strong> {mapSelectedSOS.name}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Type:</strong> {getTypeText(mapSelectedSOS.sos_type)}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Status:</strong> 
                              <span className={`ml-1 ${getStatusColor(mapSelectedSOS)}`}>
                                {getStatusText(mapSelectedSOS)}
                              </span>
                            </p>
                            {/* <button
                              onClick={() => handleSubscribeRoom(mapSelectedSOS.id, mapSelectedSOS.room_id)}
                              disabled={subscribedRooms.includes(mapSelectedSOS.room_id)}
                              className={`w-full px-2 py-1 rounded text-xs font-medium ${
                                subscribedRooms.includes(mapSelectedSOS.room_id)
                                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                              }`}
                            >
                              {subscribedRooms.includes(mapSelectedSOS.room_id) ? 'Subscribed ✓' : 'Subscribe to Room'}
                            </button> */}
                          </div>
                        </InfoWindow>
                      )}

                      {/* Police Unit Info Window */}
                      {showUnitInfoWindow && mapSelectedUnit && (
                        <InfoWindow
                          position={{ 
                            lat: mapSelectedUnit.latitude, 
                            lng: mapSelectedUnit.longitude 
                          }}
                          onCloseClick={() => setShowUnitInfoWindow(false)}
                        >
                          <div className="p-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              Police Unit #{mapSelectedUnit.unit_id}
                            </h3>
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Status:</strong> On Patrol
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Last Update:</strong> {new Date(mapSelectedUnit.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-700">
                              <strong>Location:</strong> {mapSelectedUnit.latitude.toFixed(4)}, {mapSelectedUnit.longitude.toFixed(4)}
                            </p>
                          </div>
                        </InfoWindow>
                      )}
                    </Map>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </APIProvider>
  )
} 