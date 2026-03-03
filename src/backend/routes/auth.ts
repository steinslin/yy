import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import pool from '../config/database'

const router = Router()

// JWT 密钥（生产环境应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key-change-in-production'

// 登录接口
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      })
    }

    // 查询用户
    const [rows] = (await pool.execute(
      'SELECT id, username, password, email FROM users WHERE username = ?',
      [username]
    )) as unknown as [Array<{ id: number; username: string; password: string; email: string | null }>]

    console.log('查询到的用户数量:', rows.length)
    console.log('查询用户名:', username)

    if (rows.length === 0) {
      console.log('用户不存在:', username)
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    const user = rows[0]
    console.log('查询到的用户ID:', user.id)
    console.log('数据库中的密码:', user.password)
    console.log('输入的密码:', password)

    // 验证密码：当前为明文比较；生产环境建议改为 bcrypt 等哈希比对
    const isPasswordValid = String(password) === String(user.password)
    console.log('密码验证结果:', isPasswordValid)

    if (!isPasswordValid) {
      return res.status(500).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // 返回成功响应（不返回密码）
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 注册接口（可选功能）
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为6位'
      })
    }

    // 检查用户名是否已存在
    const [existingUsers] = (await pool.execute('SELECT id FROM users WHERE username = ?', [
      username
    ])) as unknown as [Array<{ id: number }>]

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      })
    }

    // 直接使用明文密码
    // 插入新用户
    const [result] = (await pool.execute(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email || null]
    )) as any

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: result.insertId,
        username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: result.insertId,
          username,
          email: email || null
        }
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 验证 token 中间件：Authorization(Bearer) 与 x-access-token 二选一，兼容不同客户端传参方式
export const verifyToken = (req: Request, res: Response, next: any) => {
  let token: string | undefined
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else {
    token = req.headers['x-access-token'] as string | undefined
  }

  console.log('Token 验证 - Authorization header:', authHeader)
  console.log('Token 验证 - x-access-token:', req.headers['x-access-token'])
  console.log('Token 验证 - 提取的 token:', token ? `${token.substring(0, 20)}...` : '无')

  if (!token) {
    console.log('Token 验证失败: 未提供访问令牌')
    return res.status(401).json({
      success: false,
      message: '未提供访问令牌'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    })
  }
}

// 获取当前用户信息（需要 token）
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId

    const [rows] = (await pool.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [userId]
    )) as unknown as [
      Array<{
        id: number
        username: string
        email: string | null
        created_at: Date
      }>
    ]

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      data: {
        user: rows[0]
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

export default router
