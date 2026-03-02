-- 将 inventory 表的 game_name 列重命名为 app_name（已有数据库迁移用）
USE login_db;

ALTER TABLE inventory
  CHANGE COLUMN game_name app_name VARCHAR(100) NOT NULL COMMENT '应用名称';
