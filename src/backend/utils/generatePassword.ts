import bcrypt from 'bcrypt'

/**
 * 生成密码哈希值的工具脚本
 * 使用方法: npx ts-node src/utils/generatePassword.ts
 */
async function generatePasswordHash() {
  const password = process.argv[2] || 'password123'
  const hash = await bcrypt.hash(password, 10)
  console.log(`密码: ${password}`)
  console.log(`哈希值: ${hash}`)
  console.log(`\nSQL 插入语句:`)
  console.log(
    `INSERT INTO users (username, password, email) VALUES ('admin', '${hash}', 'admin@example.com');`
  )
}

generatePasswordHash().catch(console.error)
