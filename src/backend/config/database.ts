import mysql from 'mysql2/promise'

// 数据库配置（可从环境变量覆盖）
const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'login_db',
  waitForConnections: true,
  connectionLimit: 10,  // 池内最大连接数，高并发时可按需调大
  queueLimit: 0        // 等待队列长度，0 表示不限制
}

// 连接池：复用连接，避免每次请求新建/销毁连接
const pool = mysql.createPool(dbConfig)

// 测试数据库连接
export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('数据库连接成功')
    connection.release()
    return true
  } catch (error) {
    console.error('数据库连接失败:', error)
    return false
  }
}

export default pool
