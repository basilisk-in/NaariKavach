import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './components/Landing'
import { Dashboard } from './components/Dashboard'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import  AnimatedCursor  from 'react-animated-cursor'
import './App.css'

function App() {
  return (
    <>
    <AnimatedCursor innerSize={20} outerSize={20} color='252, 207, 2'/>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
    </>
  )
}

export default App
