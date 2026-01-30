import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi, type UserInfo } from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await authApi.getMe()
        setUserInfo(response.data.user)
      } catch (error) {
        console.error('获取用户信息失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>欢迎回来！</h1>
          <button onClick={handleLogout} className="logout-button">
            退出登录
          </button>
        </div>
        <div className="user-info">
          <div className="info-item">
            <span className="info-label">用户ID:</span>
            <span className="info-value">{userInfo?.id || user?.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">用户名:</span>
            <span className="info-value">{userInfo?.username || user?.username}</span>
          </div>
          <div className="info-item">
            <span className="info-label">邮箱:</span>
            <span className="info-value">{userInfo?.email || user?.email || '未设置'}</span>
          </div>
          {userInfo?.created_at && (
            <div className="info-item">
              <span className="info-label">注册时间:</span>
              <span className="info-value">
                {new Date(userInfo.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
