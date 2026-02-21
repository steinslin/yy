-- 将 inventory 表的 game_code 列重命名为 app_id（已有数据库迁移用）
USE login_db;

ALTER TABLE inventory
  DROP INDEX idx_game_code,
  CHANGE COLUMN game_code app_id VARCHAR(50) NOT NULL COMMENT '应用ID',
  ADD INDEX idx_app_id (app_id);
