-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS login_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE login_db;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  email VARCHAR(100) COMMENT '邮箱',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 插入测试用户（明文密码）
-- 实际使用时应该通过注册接口创建用户，这里仅作示例
-- 密码: password123
INSERT INTO users (username, password, email) VALUES 
('admin', 'password123', 'admin@example.com')
ON DUPLICATE KEY UPDATE password='password123';

-- 库存管理表
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  game_name VARCHAR(100) NOT NULL COMMENT '游戏名称',
  game_code VARCHAR(50) NOT NULL COMMENT '游戏编码',
  tier_name VARCHAR(100) NOT NULL COMMENT '档位名称',
  tier_price DECIMAL(10, 2) NOT NULL COMMENT '档位价格',
  tier_code VARCHAR(50) NOT NULL COMMENT '档位编码',
  currency_code VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '货币代码',
  inventory_no VARCHAR(100) NOT NULL UNIQUE COMMENT '库存单号',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-待入库，1-已入库，2-已出库，3-已使用，4-已取消',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  in_account VARCHAR(100) COMMENT '入库账户',
  in_time TIMESTAMP NULL COMMENT '入库时间',
  out_account VARCHAR(100) COMMENT '出库账户',
  out_time TIMESTAMP NULL COMMENT '出库时间',
  used_time TIMESTAMP NULL COMMENT '使用时间',
  remark TEXT COMMENT '备注',
  in_trace_id VARCHAR(100) COMMENT '入库TRACE ID',
  out_trace_id VARCHAR(100) COMMENT '出库TRACE ID',
  in_device VARCHAR(200) COMMENT '入库设备',
  out_device VARCHAR(200) COMMENT '出库设备',
  type VARCHAR(50) COMMENT '类型',
  INDEX idx_game_code (game_code),
  INDEX idx_tier_code (tier_code),
  INDEX idx_inventory_no (inventory_no),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_in_time (in_time),
  INDEX idx_out_time (out_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存管理表';

-- 应用商品表
CREATE TABLE IF NOT EXISTS app_products (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  app_id VARCHAR(100) NOT NULL COMMENT '应用ID',
  app_name VARCHAR(200) COMMENT '应用名称',
  product_id VARCHAR(100) NOT NULL COMMENT '商品ID',
  name VARCHAR(200) COMMENT '商品名称',
  price VARCHAR(50) COMMENT '价格',
  quantity INT NOT NULL DEFAULT 0 COMMENT '数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_app_id (app_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用商品表';
