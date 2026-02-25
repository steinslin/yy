import express, { type Request, type Response } from 'express'
import pool from '../config/database'

const router = express.Router()

/*
请求体
{
  "app_id": "com.lastwar.ios",
  "product_id": "prodios_1",
  "transaction_date": "2026-02-11 17:30:26",
  "transaction_id": "470003053702685",
  "new_receipt": "base64...",
  "receipt": "base64..."
}
**返回体（成功）**：`{ "code": 0, "message": "上传成功" }`

**异常返回**：`code != 0`（如 `1`）+ `message`。
*/
router.post('/upload', async (req: Request, res: Response) => {
    try {
        const { app_id, product_id, transaction_date, transaction_id, new_receipt, receipt } = req.body ?? {}
        if (!app_id || !product_id || !transaction_date || !transaction_id || !new_receipt) {
            return res.status(200).json({ code: 1, message: '参数缺失' })
        }

        // 根据app_id和produdt_id查询app_products表，获取app相关信息
        const app_products = await pool.execute('SELECT * FROM app_products WHERE app_id = ? AND product_id = ?', [app_id, product_id])
        if (!app_products) {
            return res.status(200).json({ code: 1, message: 'app_products 不存在' })
        }
        const app_product = (app_products as unknown as { app_id: string; product_id: string; app_name: string; product_name: string; price: string; quantity: number }[])[0]
        if (!app_product) {
            return res.status(200).json({ code: 1, message: 'app_product 不存在' })
        }
        const game_name = app_product.app_name
        const tier_name = app_product.product_name
        const tier_price = app_product.price
        const tier_code = app_product.product_id
        const currency_code = 'CNY' // TODO

        // 将结果存入inventory表
        /*
          game_name VARCHAR(100) NOT NULL COMMENT '游戏名称',
            app_id VARCHAR(50) NOT NULL COMMENT '应用ID',
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
            transaction_date DATETIME NULL COMMENT '交易时间',
            transaction_id VARCHAR(100) COMMENT '交易号',
            new_receipt LONGTEXT COMMENT '新凭证 Base64',
            receipt LONGTEXT COMMENT '旧凭证 Base64',
        */
        const inventory_no = crypto.randomUUID()
        const created_at = new Date()
        const in_account = 'system'
        const in_time = new Date()
        const out_account = 'system'
        const out_time = new Date()
        const used_time = new Date()
        const in_trace_id = ''
        const out_trace_id = ''
        const in_device = ''
        const out_device = ''
        const type = 'upload'
        const status = 1
        const sql = `INSERT INTO inventory (game_name, app_id, tier_name, tier_price, tier_code, currency_code, inventory_no, status, created_at, in_account, in_time, out_account, out_time, used_time, remark, in_trace_id, out_trace_id, in_device, out_device, type, transaction_date, transaction_id, new_receipt, receipt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        await pool.execute(sql, [game_name, app_id, tier_name, tier_price, tier_code, currency_code, inventory_no, status, created_at, in_account, in_time, out_account, out_time, used_time, in_trace_id, out_trace_id, in_device, out_device, type, transaction_date, transaction_id, new_receipt, receipt])

        return res.status(200).json({ code: 0, message: '上传成功' })
    } catch (err) {
        console.error('POST /api/receipts/upload error:', err)
        return res.status(200).json({ code: 1, message: (err as Error).message || '上传失败' })
    }
})

export default router