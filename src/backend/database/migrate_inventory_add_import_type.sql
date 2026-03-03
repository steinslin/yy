-- 迁移脚本：为 inventory 表添加入库类型字段 import_type（仅对已有表执行一次）
USE login_db;

ALTER TABLE inventory
  ADD COLUMN import_type VARCHAR(20) COMMENT '入库类型：upload-插件上传，import-Excel导入' AFTER out_device;
