import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Challenges from './pages/Challenges'
import Leaderboard from './pages/Leaderboard'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import LoggingAndMonitoring from './pages/LoggingAndMonitoring';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForgotAdminPassword from './pages/ForgotAdminPassword';
import VerifyEmail from './pages/VerifyEmail';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Admin />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/logging" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <LoggingAndMonitoring />
            </ProtectedRoute>
          } 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-admin-password" element={<ForgotAdminPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
