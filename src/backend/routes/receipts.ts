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

/** inventory 表出库查询行类型（receipts/get 用），new_receipt/receipt 为 NOT NULL */
interface InventoryRow {
    id: number
    app_id: string
    tier_code: string
    transaction_id: string | null
    created_at: Date
    new_receipt: string
    receipt: string
}

const REQUIRED_BODY_KEYS = ['app_id', 'product_id', 'transaction_date', 'transaction_id', 'new_receipt', 'receipt'] as const
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
        if (new_receipt == null || String(new_receipt).trim() === '') {
            return send(1, 'new_receipt 不能为空')
        }
        if (receipt == null || String(receipt).trim() === '') {
            return send(1, 'receipt 不能为空')
        }

        // 上传前校验：该 app_id+product_id 必须在 app_products 中已配置，且必填字段齐全（用于补全 app_name、tier_name 等）
        const [rows] = (await pool.execute('SELECT * FROM app_products WHERE app_id = ? AND product_id = ? LIMIT 1', [app_id, product_id])) as unknown as [AppProductRow[]]
        const app_product = rows?.[0]
        console.log('/upload app_product', app_product)
        if (!app_product) {
            return send(1, 'app_product 不存在')
        }
        const missingField = REQUIRED_APP_PRODUCT_FIELDS.find(({ key }) => !app_product[key])
        if (missingField) {
            return send(1, `app_product 不全，缺少 ${missingField.label}`)
        }

        const app_name = app_product.app_name ?? ''
        const tier_name = app_product.name ?? ''
        const tier_price = app_product.price ?? 0
        const tier_code = app_product.product_id ?? ''
        const currency_code = 'CNY' // TODO

        // 去重：同一笔交易（app_id + tier_code + transaction_id）只允许一条库存记录，避免客户端重复上传
        const [existing] = (await pool.execute(
            'SELECT id FROM inventory WHERE app_id = ? AND tier_code = ? AND transaction_id = ? LIMIT 1',
            [app_id, tier_code, transaction_id]
        )) as unknown as [unknown[]]
        if (Array.isArray(existing) && existing.length > 0) {
            console.log('/upload duplicate skipped', { app_id, product_id, transaction_id })
            return send(1, '凭证已存在，不重复插入')
        }

        const now = new Date()
        const inventoryRow = {
            app_name,
            app_id,
            tier_name,
            tier_price,
            tier_code,
            currency_code,
            status: 0,
            created_at: now,
            in_account: 'plugin_server',
            in_time: now,
            remark: null as string | null,
            in_device: '',
            out_device: '',
            import_type: 'upload',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            transaction_date: transaction_date ? new Date(transaction_date) : now,
            transaction_id,
            new_receipt: String(new_receipt).trim(),
            receipt: String(receipt).trim(),
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

/**
 * ### 1. POST `/api/receipts/get`

读取inventory表获取一条状态为待出库(0)的凭证，取走后将状态标记为出库中(1)

**请求体字段**：

| 字段 | 含义 | 必传 |
|------|------|------|
| **app_id** | 应用包名（同 products 的 app_id） | 是 |
| **product_id** | 内购商品 ID，用于匹配凭证 | 是 |
| **name** | 商品展示名，仅辅助 | 否 |

**请求体示例**：
```json
{
  "app_id": "com.lastwar.ios",
  "product_id": "prodios_1",
  "name": "Hot Package1"
}
```

**返回体字段（成功时 data 内）**：

| 字段 | 含义 |
|------|------|
| **receipt_id** | 凭证记录 ID（同条凭证上报 invalid/consume 时传此 id） |
| **transaction_id** | 交易号（如苹果 transactionIdentifier） |
| **created_at** | 交易时间，格式 `yyyy-MM-dd HH:mm:ss` |
| **new_receipt** | 客户端凭证，不可为 null |
| **receipt** | 临时客户端凭证，不可为 null |

**返回体示例（成功）**：
```json
{
  "code": 0,
  "data": {
    "receipt_id": "1",
    "transaction_id": "470003053702685",
    "created_at": "2026-02-11 17:30:26",
    "new_receipt": "MIIUKQYJKoZIhvcNAQcCoIIU...",
    "receipt": "ewoJInNpZ25hdHVyZSIgPSAiQkVJ..."
  }
}
```

**返回体（无可用凭证）**：`{ "code": 400, "message": "暂无可用凭证，请先在入库完成购买并上传凭证" }`（HTTP 状态码仍为 200）
 */
router.post('/get', async (req: Request, res: Response) => {
    const sendErr = (code: number, message: string) => res.status(200).json({ code, message })
    const sendOk = (data: Record<string, unknown>) => res.status(200).json({ code: 0, data })
    try {
        const body = req.body ?? {}
        console.log('/get body', body)
        const { app_id, product_id } = body
        if (!app_id || !product_id) {
            return sendErr(1, '缺少 app_id 或 product_id')
        }

        // 事务 + FOR UPDATE：锁定「待出库」中的一条，防止多端并发取到同一条凭证
        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction()
            const [rows] = await conn.execute(
                'SELECT id, app_id, tier_code, transaction_id, created_at, new_receipt, receipt FROM inventory WHERE app_id = ? AND tier_code = ? AND status = 0 ORDER BY id ASC LIMIT 1 FOR UPDATE',
                [app_id, product_id]
            )
            const row = (Array.isArray(rows) ? rows[0] : undefined) as InventoryRow | undefined
            if (!row) {
                await conn.rollback()
                console.log('/get no available receipt')
                return sendErr(400, '暂无可用凭证，请先在入库完成购买并上传凭证')
            }

            // 取走后立即标记为「出库中」，避免其他请求再取到同一条
            console.log('/get update status to 1')
            await conn.execute('UPDATE inventory SET status = 1, out_time = NOW() WHERE id = ?', [row.id])
            await conn.commit()

            const createdAt = row.created_at instanceof Date
                ? row.created_at
                : new Date(row.created_at as string)
            const createdAtStr = createdAt.toISOString().slice(0, 19).replace('T', ' ')
            console.log('/get sendOk', {
                receipt_id: String(row.id),
                transaction_id: row.transaction_id ?? '',
                created_at: createdAtStr,
                new_receipt: row.new_receipt,
                receipt: row.receipt,
            })
            return sendOk({
                receipt_id: String(row.id),
                transaction_id: row.transaction_id ?? '',
                created_at: createdAtStr,
                new_receipt: row.new_receipt,
                receipt: row.receipt,
            })
        } finally {
            conn.release()
        }
    } catch (err) {
        console.error('POST /api/receipts/get error:', err)
        return sendErr(1, (err as Error).message || '获取失败')
    }
})

/**
 * ### 2. POST `/api/receipts/invalid`
 *
 * 更新 inventory 表凭证状态 status 为出库失败(2)，并设置 remark 为 err_code+err_msg。
 *
 * **请求体**：id（凭证记录 ID）、err_code、err_msg 必传；token 可选。
 * **返回体（成功）**：`{ "code": 0 }`
 */
router.post('/invalid', async (req: Request, res: Response) => {
    const sendErr = (code: number, message?: string) =>
        res.status(200).json(message != null ? { code, message } : { code })
    const sendOk = () => res.status(200).json({ code: 0 })
    try {
        const body = req.body ?? {}
        console.log('/invalid body', body)
        const { id, err_code = '', err_msg = '' } = body
        if (!id) {
            return sendErr(1, '缺少 id')
        }
        const inventoryId = Number(id)
        if (!Number.isInteger(inventoryId) || inventoryId < 1) {
            return sendErr(1, 'id 无效')
        }
        const remark = `${String(err_code).trim()}: ${String(err_msg).trim()}`
        const [result] = await pool.execute(
            'UPDATE inventory SET status = 2, remark = ? WHERE id = ?',
            [remark, inventoryId]
        )
        const affectedRows = (result as { affectedRows?: number }).affectedRows ?? 0
        if (affectedRows === 0) {
            console.log('/invalid record not found')
            return sendErr(404, '记录不存在')
        }
        console.log('/invalid update status to 2')
        console.log('/invalid sendOk')
        return sendOk()
    } catch (err) {
        console.error('POST /api/receipts/invalid error:', err)
        return sendErr(1, (err as Error).message || '更新失败')
    }
})

/**
 * ### 3. POST `/api/receipts/consume`
 *
 * 更新 inventory 表凭证状态为出库成功(3)。
 *
 * **请求体**：id（凭证记录 ID）必传；token 可选。
 * **返回体（成功）**：`{ "code": 0 }`
 */
router.post('/consume', async (req: Request, res: Response) => {
    const sendErr = (code: number, message?: string) =>
        res.status(200).json(message != null ? { code, message } : { code })
    const sendOk = () => res.status(200).json({ code: 0 })
    try {
        const body = req.body ?? {}
        console.log('/consume body', body)
        const { id } = body
        if (!id) {
            return sendErr(1, '缺少 id')
        }
        const inventoryId = Number(id)
        if (!Number.isInteger(inventoryId) || inventoryId < 1) {
            return sendErr(1, 'id 无效')
        }
        console.log('/consume update status to 3')
        const [result] = await pool.execute(
            'UPDATE inventory SET status = 3 WHERE id = ?',
            [inventoryId]
        )
        const affectedRows = (result as { affectedRows?: number }).affectedRows ?? 0
        if (affectedRows === 0) {
            console.log('/consume record not found')
            return sendErr(404, '记录不存在')
        }
        console.log('/consume sendOk')
        return sendOk()
    } catch (err) {
        console.error('POST /api/receipts/consume error:', err)
        return sendErr(1, (err as Error).message || '更新失败')
    }
})

export default router
