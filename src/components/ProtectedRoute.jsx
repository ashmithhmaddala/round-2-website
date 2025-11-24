import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminAuth } from '../utils/api'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (requireAdmin) {
      const isAuthenticated = getAdminAuth()
      if (!isAuthenticated) {
        navigate('/admin-login', { replace: true })
      }
    }
  }, [navigate, requireAdmin])

  if (requireAdmin && !getAdminAuth()) {
    return null // Don't render anything while redirecting
  }

  return children
}

