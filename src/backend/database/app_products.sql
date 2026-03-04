USE login_db;

-- 应用商品表：维护各应用（app_id）下的内购档位（product_id），与 inventory 的 tier_code 对应，供上传凭证时补全 app_name/tier_name 等
CREATE TABLE IF NOT EXISTS app_products (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  app_id VARCHAR(100) NOT NULL COMMENT '应用ID',
  app_name VARCHAR(200) COMMENT '应用名称',
  product_id VARCHAR(100) NOT NULL COMMENT '商品ID',
  name VARCHAR(200) COMMENT '档位名称',
  price VARCHAR(50) COMMENT '价格',
  quantity INT NOT NULL DEFAULT 0 COMMENT '数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_app_id (app_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用商品表';
