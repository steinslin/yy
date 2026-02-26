import crypto from 'node:crypto'
import express, { type Request, type Response } from 'express'
import pool from '../config/database'

const router = express.Router()

/** app_products 表查询结果行类型 */
interface AppProductRow {
    app_id: string
    product_id: string
    app_name: string
    name: string
    price: string
    quantity: number
}

const REQUIRED_BODY_KEYS = ['app_id', 'product_id', 'transaction_date', 'transaction_id', 'new_receipt'] as const
const REQUIRED_APP_PRODUCT_FIELDS: { key: keyof AppProductRow; label: string }[] = [
    { key: 'app_name', label: 'app_name' },
    { key: 'name', label: 'name' },
    { key: 'price', label: 'price' },
    { key: 'product_id', label: 'product_id' },
]

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
    const send = (code: number, message: string) => res.status(200).json({ code, message })
    try {
        const body = req.body ?? {}
        console.log('/upload', body)
        const missingBody = REQUIRED_BODY_KEYS.find((key) => !body[key])
        console.log('/upload missingBody', missingBody)
        if (missingBody) {
            return send(1, '参数缺失')
        }
        const { app_id, product_id, transaction_date, transaction_id, new_receipt, receipt } = body

        const [rows] = await pool.execute<unknown[]>('SELECT * FROM app_products WHERE app_id = ? AND product_id = ? LIMIT 1', [app_id, product_id])
        const app_product = rows?.[0] as AppProductRow | undefined
        console.log('/upload app_product', app_product)
        if (!app_product) {
            return send(1, 'app_product 不存在')
        }
        const missingField = REQUIRED_APP_PRODUCT_FIELDS.find(({ key }) => !app_product[key])
        if (missingField) {
            return send(1, `app_product 不全，缺少 ${missingField.label}`)
        }

        const game_name = app_product.app_name ?? ''
        const tier_name = app_product.name ?? ''
        const tier_price = app_product.price ?? 0
        const tier_code = app_product.product_id ?? ''
        const currency_code = 'CNY' // TODO

        const now = new Date()
        const inventoryRow = {
            game_name,
            app_id,
            tier_name,
            tier_price,
            tier_code,
            currency_code,
            inventory_no: crypto.randomUUID(),
            status: 1,
            created_at: now,
            in_account: 'system',
            in_time: now,
            out_account: 'system',
            out_time: now,
            used_time: now,
            remark: null as string | null,
            in_trace_id: '',
            out_trace_id: '',
            in_device: '',
            out_device: '',
            type: 'upload',
            transaction_date,
            transaction_id,
            new_receipt,
            receipt,
        }
        console.log('/upload inventoryRow', inventoryRow)
        const cols = Object.keys(inventoryRow).join(', ')
        const placeholders = Object.keys(inventoryRow).map(() => '?').join(', ')
        await pool.execute(
            `INSERT INTO inventory (${cols}) VALUES (${placeholders})`,
            Object.values(inventoryRow)
        )

        console.log('/upload success')
        return send(0, '上传成功')
    } catch (err) {
        console.error('POST /api/receipts/upload error:', err)
        return send(1, (err as Error).message || '上传失败')
    }
})

export default router
