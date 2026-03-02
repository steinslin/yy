-- 去除 inventory 表的 inventory_no 列，库存单号改用 transaction_id；已有数据将 inventory_no 同步到 transaction_id 后删除该列
USE login_db;

-- 将原 inventory_no 同步到 transaction_id（仅当 transaction_id 为空时）
UPDATE inventory SET transaction_id = inventory_no WHERE transaction_id IS NULL OR transaction_id = '';

-- 删除库存单号列及索引
ALTER TABLE inventory
  DROP INDEX idx_inventory_no,
  DROP COLUMN inventory_no;

-- 为 transaction_id 添加索引便于查询
ALTER TABLE inventory ADD INDEX idx_transaction_id (transaction_id);
