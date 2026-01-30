import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!username || !password) {
      message.error('请输入用户名和密码')
      return
    }

    setLoading(true)

    try {
      await login(username, password)
      message.success('登录成功')
      console.log('Login', username, password)
      // 直接跳转，状态已经更新
      navigate('/home', { replace: true })
    } catch (err: unknown) {
      console.log('Login2', username, password)
      const errorMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ??
        (err as { message?: string })?.message ??
        '登录失败，请重试'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-dialog">
        <h1 className="login-title">云充值</h1>
        <p className="login-subtitle">欢迎使用云充值服务</p>
        <div className="login-form">
          <div className="form-item">
            <label className="form-label">用户名</label>
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              value={username}
              onChange={e => {
                setUsername(e.target.value)
              }}
              disabled={loading}
              onPressEnter={handleSubmit}
            />
          </div>
          <div className="form-item">
            <label className="form-label">密码</label>
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
              }}
              disabled={loading}
              onPressEnter={handleSubmit}
            />
          </div>
          <Button type="primary" size="large" block loading={loading} onClick={handleSubmit}>
            登录系统
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Login
