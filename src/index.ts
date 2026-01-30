import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth'
import { testConnection } from './config/database'

const app: Application = express()
const port = process.env.PORT ?? 3000

// 中间件
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// 健康检查接口
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: '服务器运行正常' })
})

// 认证路由
app.use('/api/auth', authRoutes)

// 定义一个类型化的路由
interface User {
  id: number
  name: string
}

app.get('/api/users', (req: Request, res: Response<User[]>) => {
  const users: User[] = [{ id: 1, name: '张三' }]
  res.json(users)
})

// 启动服务器
app.listen(port, async () => {
  console.log(`服务器运行在 http://localhost:${port}`)

  // 测试数据库连接
  await testConnection()
})
