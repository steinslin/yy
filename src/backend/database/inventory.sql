USE login_db;

-- 库存管理表：每条记录为一笔凭证（内购收据），status 0 待出库→1 出库中→2 出库失败 / 3 出库成功
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  app_name VARCHAR(100) NOT NULL COMMENT '应用名称',
  app_id VARCHAR(50) NOT NULL COMMENT '应用ID',
  tier_name VARCHAR(100) NOT NULL COMMENT '档位名称',
  tier_price DECIMAL(10, 2) NOT NULL COMMENT '档位价格',
  tier_code VARCHAR(50) NOT NULL COMMENT '档位编码',
  currency_code VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '货币代码',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-待出库，1-出库中，2-出库失败，3-出库成功',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  in_account VARCHAR(100) COMMENT '入库账户',
  in_time TIMESTAMP NULL COMMENT '入库时间',
  out_account VARCHAR(100) COMMENT '出库账户',
  out_time TIMESTAMP NULL COMMENT '出库时间',
  used_time TIMESTAMP NULL COMMENT '使用时间',
  remark TEXT COMMENT '备注',
  in_device VARCHAR(200) COMMENT '入库设备',
  out_device VARCHAR(200) COMMENT '出库设备',
  transaction_date DATETIME NULL COMMENT '交易时间',
  transaction_id VARCHAR(100) COMMENT '库存单号/交易号（去重与对账用）',
  new_receipt LONGTEXT NOT NULL COMMENT '客户端凭证（当前有效收据 Base64）',
  receipt LONGTEXT NOT NULL COMMENT '临时/旧版客户端凭证 Base64',
  INDEX idx_app_id (app_id),
  INDEX idx_tier_code (tier_code),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_in_time (in_time),
  INDEX idx_out_time (out_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存管理表：凭证入库、出库、状态 0~3';
