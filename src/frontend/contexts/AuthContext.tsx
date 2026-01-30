import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi, type UserInfo } from '../services/api'

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 从 localStorage 恢复 token 和用户信息
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // 先设置状态，让用户能够访问页面
        setToken(savedToken)
        setUser(parsedUser)
        setLoading(false)
        // 然后在后台验证 token 是否有效（不阻塞页面加载）
        authApi
          .getMe()
          .then(response => {
            setUser(response.data.user)
            localStorage.setItem('user', JSON.stringify(response.data.user))
          })
          .catch(error => {
            console.error('Token 验证失败:', error)
            // Token 无效，清除本地存储
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setToken(null)
            setUser(null)
          })
      } catch (error) {
        console.error('解析用户信息失败:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password })
    if (response.success) {
      const token = response.data.token
      const user = response.data.user
      // 先保存到 localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      // 然后更新状态
      setToken(token)
      setUser(user)
    } else {
      throw new Error(response.message)
    }
  }

  const register = async (username: string, password: string, email?: string) => {
    const response = await authApi.register({ username, password, email })
    if (response.success) {
      setToken(response.data.token)
      setUser(response.data.user)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    } else {
      throw new Error(response.message)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
