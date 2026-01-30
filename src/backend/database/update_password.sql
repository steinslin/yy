-- 更新用户密码为明文
-- 将现有用户的密码更新为明文密码

USE login_db;

-- 更新 admin 用户的密码为明文 password123
UPDATE users 
SET password = 'password123' 
WHERE username = 'admin';

-- 如果数据库中有其他用户，也可以批量更新
-- 注意：这会将所有用户的密码都设置为 password123
-- 如果需要不同的密码，请单独更新每个用户

-- 查看更新后的用户信息
SELECT id, username, email, created_at FROM users;
