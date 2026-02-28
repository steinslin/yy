-- 插入 app_products 表测试数据
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE login_db;

-- 清空现有测试数据（可选）
-- DELETE FROM app_products WHERE id > 0;

INSERT INTO app_products (app_id, app_name, product_id, name, price, quantity) VALUES
-- com.lastwar.ios（与 receipts 接口示例一致）
('com.lastwar.ios', 'Last War', 'prodios_1', 'Hot Package1', '6', 0),
('com.lastwar.ios', 'Last War', 'prodios_2', 'Hot Package2', '12', 0),
('com.lastwar.ios', 'Last War', 'prodios_3', 'Hot Package3', '30', 0),
('com.lastwar.ios', 'Last War', 'prodios_4', 'Hot Package4', '68', 0),
('com.lastwar.ios', 'Last War', 'prodios_5', 'Hot Package5', '128', 0),

-- GAME001 王者荣耀（与 insert_test_data 中 inventory 对应）
('GAME001', '王者荣耀', 'TIER001', '68元档位', '68', 0),
('GAME001', '王者荣耀', 'TIER002', '128元档位', '128', 0),

-- GAME002 和平精英
('GAME002', '和平精英', 'TIER002', '128元档位', '128', 0),
('GAME002', '和平精英', 'TIER004', '198元档位', '198', 0),

-- GAME003 原神
('GAME003', '原神', 'TIER003', '30元档位', '30', 0),
('GAME003', '原神', 'TIER005', '98元档位', '98', 0),
('GAME003', '原神', 'TIER007', '328元档位', '328', 0),

-- GAME004 英雄联盟
('GAME004', '英雄联盟', 'TIER006', '50元档位', '50', 0),
('GAME004', '英雄联盟', 'TIER008', '100元档位', '100', 0),

-- GAME005 穿越火线
('GAME005', '穿越火线', 'TIER009', '88元档位', '88', 0),
('GAME005', '穿越火线', 'TIER010', '168元档位', '168', 0);
