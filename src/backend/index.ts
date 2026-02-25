import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth'
import inventoryRoutes from './routes/inventory'
import productsRoutes from './routes/products'
import receiptsRoutes from './routes/receipts'
import { testConnection } from './config/database'

const app: Application = express()
const port = process.env.PORT ?? 3000

// 跨域：允许所有来源，或通过 CORS_ORIGIN 指定（多个用逗号分隔）
const corsOrigin = process.env.CORS_ORIGIN
const corsOptions: cors.CorsOptions = {
  origin: corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : true, // true 表示允许任意 origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}
app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
// 增加请求体大小限制以支持文件上传
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))

// 健康检查接口
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: '服务器运行正常' })
})

// 认证路由
app.use('/api/auth', authRoutes)

// 库存路由
app.use('/api/inventory', inventoryRoutes)

// 商品采集路由（无需 token）
app.use('/api/products', productsRoutes)

// 收据上传路由
app.use('/api/receipts', receiptsRoutes)

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
