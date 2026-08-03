import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="auth-loading" />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
