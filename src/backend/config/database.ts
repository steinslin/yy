import mysql from 'mysql2/promise'

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'login_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

// 创建连接池
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
