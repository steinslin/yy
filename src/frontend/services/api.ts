import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：从 localStorage 取 token，并同时带 Authorization(Bearer) 与 x-access-token，兼容后端两种校验方式
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      config.headers['x-access-token'] = token
    }
    return config
  },
  async error => {
    return await Promise.reject(error)
  }
)

// 响应拦截器：401 时清空本地登录态并跳转登录页，避免过期 token 继续请求
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return await Promise.reject(error)
  }
)

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: {
      id: number
      username: string
      email: string | null
    }
  }
}

export interface UserInfo {
  id: number
  username: string
  email: string | null
  created_at?: string
}

export interface UserInfoResponse {
  success: boolean
  data: {
    user: UserInfo
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  getMe: async (): Promise<UserInfoResponse> => {
    const response = await api.get<UserInfoResponse>('/auth/me')
    return response.data
  }
}

export default api
