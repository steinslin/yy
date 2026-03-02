-- 迁移脚本：删除 inventory 表的 type 字段（仅对已有该字段的库执行一次）
USE login_db;

ALTER TABLE inventory DROP COLUMN type;
