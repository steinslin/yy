-- 迁移脚本：为已存在的 inventory 表新增 transaction_date、transaction_id、new_receipt、receipt 等字段（仅对老库执行一次）
USE login_db;

ALTER TABLE inventory
  ADD COLUMN transaction_date DATETIME NULL COMMENT '交易时间' AFTER type,
  ADD COLUMN transaction_id VARCHAR(100) COMMENT '交易号' AFTER transaction_date,
  ADD COLUMN new_receipt LONGTEXT COMMENT '新凭证 Base64' AFTER transaction_id,
  ADD COLUMN receipt LONGTEXT COMMENT '旧凭证 Base64' AFTER new_receipt;
