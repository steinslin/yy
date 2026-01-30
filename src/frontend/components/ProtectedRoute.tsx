import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'
import '../pages/Dashboard.css'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, token, user } = useAuth()
  console.log('ProtectedRoute', isAuthenticated, loading, token, user)

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  // 检查认证状态：有 token 和 user 就认为已认证
  // 这样可以避免在 token 验证过程中被重定向
  const authenticated = !!(token && user)

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
