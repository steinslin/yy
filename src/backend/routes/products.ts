import express, { type Request, type Response } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import pool from '../config/database'
import { verifyToken } from './auth'
import {
  appProductsExcelMapping,
  getAppProductsRequiredFields
} from '../config/excelMapping'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持上传 Excel 文件 (.xlsx, .xls)'))
    }
  }
})

/** 游戏档位管理：分页列表，需 token */
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 10))
    const appId = typeof req.query.app_id === 'string' ? req.query.app_id.trim() : ''
    const appName = typeof req.query.app_name === 'string' ? req.query.app_name.trim() : ''
    const createdStart = typeof req.query.created_at_start === 'string' ? req.query.created_at_start.trim() : ''
    const createdEnd = typeof req.query.created_at_end === 'string' ? req.query.created_at_end.trim() : ''
    const offset = (page - 1) * pageSize

    const conditions: string[] = []
    const params: Array<string | number> = []
    if (appId) {
      conditions.push('app_id = ?')
      params.push(appId)
    }
    if (appName) {
      conditions.push('app_name LIKE ?')
      params.push(`%${appName}%`)
    }
    if (createdStart) {
      conditions.push('created_at >= ?')
      params.push(`${createdStart} 00:00:00`)
    }
    if (createdEnd) {
      conditions.push('created_at <= ?')
      params.push(`${createdEnd} 23:59:59`)
    }
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM app_products${whereClause}`,
      params
    )
    const total = (Array.isArray(countRows) && countRows[0] && typeof (countRows[0] as { total?: number }).total === 'number')
      ? (countRows[0] as { total: number }).total
      : 0

    const [rows] = await pool.execute(
      `SELECT id, app_id, app_name, product_id, name, price, quantity, created_at, updated_at FROM app_products${whereClause} ORDER BY created_at DESC, id DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params
    )
    const list = (rows as Array<Record<string, unknown>>) ?? []

    return res.status(200).json({ success: true, data: { list, total, page, pageSize } })
  } catch (err) {
    console.error('GET /api/products error:', err)
    return res.status(500).json({ success: false, message: (err as Error).message })
  }
})

/** 游戏档位管理：新增一条，需 token */
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {}
    const { app_id: appId, app_name: appName, product_id: productId, name, price, quantity } = body
    if (!appId || String(appId).trim() === '') {
      return res.status(400).json({ success: false, message: 'app_id 不能为空' })
    }
    if (!productId || String(productId).trim() === '') {
      return res.status(400).json({ success: false, message: 'product_id 不能为空' })
    }
    const appIdStr = String(appId).trim()
    const productIdStr = String(productId).trim()
    const appNameStr = appName != null ? String(appName).trim() : ''
    const nameStr = name != null ? String(name).trim() : ''
    const priceStr = price != null ? String(price).trim() : ''
    const q = quantity != null ? Number(quantity) : 0
    const quantityNum = Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0

    const [existing] = await pool.execute(
      'SELECT id FROM app_products WHERE app_id = ? AND product_id = ? LIMIT 1',
      [appIdStr, productIdStr]
    )
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(400).json({ success: false, message: '该应用下已存在相同 product_id' })
    }

    const [result] = await pool.execute(
      'INSERT INTO app_products (app_id, app_name, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
      [appIdStr, appNameStr, productIdStr, nameStr, priceStr, quantityNum]
    )
    const insertId = (result as { insertId?: number }).insertId
    return res.status(201).json({ success: true, message: '创建成功', data: { id: insertId } })
  } catch (err) {
    console.error('POST /api/products error:', err)
    return res.status(500).json({ success: false, message: (err as Error).message })
  }
})

/** 游戏档位管理：批量导入 Excel，按 app_id+product_id 过滤已存在记录，需 token */
router.post('/import', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' })
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][]
    if (rawData.length < 2) {
      return res.status(400).json({ success: false, message: 'Excel 至少需要表头和数据行' })
    }
    const headers = (rawData[0] as unknown[]).map(h => String(h ?? '').trim())
    const requiredFields = getAppProductsRequiredFields()
    const missingHeaders = requiredFields.filter(f => !headers.some(h => h === f))
    if (missingHeaders.length > 0) {
      return res.status(400).json({ success: false, message: `缺少必填列: ${missingHeaders.join(', ')}` })
    }
    const columnIndexMap: Record<string, number> = {}
    headers.forEach((h, i) => {
      const m = appProductsExcelMapping.find(x => x.excelColumn === h)
      if (m) columnIndexMap[m.dbField] = i
    })
    const insertData: Array<Record<string, unknown>> = []
    const errors: string[] = []
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[]
      if (row.every(c => c === null || c === undefined || String(c).trim() === '')) continue
      const record: Record<string, unknown> = {}
      for (const m of appProductsExcelMapping) {
        const idx = columnIndexMap[m.dbField]
        if (idx != null && idx < row.length) {
          let v = row[idx]
          if (m.transform && v != null) v = m.transform(v)
          if ((v === null || v === undefined || String(v).trim() === '') && !m.required) v = m.defaultValue ?? null
          record[m.dbField] = v
        } else if (m.defaultValue !== undefined) record[m.dbField] = m.defaultValue
      }
      const missing = requiredFields.filter(f => {
        const field = appProductsExcelMapping.find(m => m.excelColumn === f)?.dbField
        const v = field ? record[field] : undefined
        return v === null || v === undefined || String(v).trim() === ''
      })
      if (missing.length > 0) {
        errors.push(`第 ${i + 2} 行缺少: ${missing.join(', ')}`)
        continue
      }
      record.app_id = String(record.app_id ?? '').trim()
      record.app_name = String(record.app_name ?? '').trim()
      record.product_id = String(record.product_id ?? '').trim()
      record.name = String(record.name ?? '').trim()
      record.price = String(record.price ?? '').trim()
      record.quantity = Number(record.quantity) || 0
      insertData.push(record)
    }
    if (insertData.length === 0) {
      return res.status(400).json({
        success: false,
        message: errors.length > 0 ? '数据验证失败' : '没有有效数据可导入',
        data: { errors: errors.length ? errors : undefined }
      })
    }
    const keys = insertData.map(r => [r.app_id, r.product_id] as [string, string])
    const existingSet = new Set<string>()
    if (keys.length > 0) {
      const placeholders = keys.map(() => '(?, ?)').join(', ')
      const params = keys.flat()
      const [existingRows] = (await pool.execute(
        `SELECT app_id, product_id FROM app_products WHERE (app_id, product_id) IN (${placeholders})`,
        params
      )) as unknown as [Array<{ app_id: string; product_id: string }>]
      const rows = Array.isArray(existingRows) ? existingRows : []
      for (const r of rows) existingSet.add(`${r.app_id}|${r.product_id}`)
    }
    const toInsert: Array<Record<string, unknown>> = []
    for (const r of insertData) {
      const key = `${r.app_id}|${r.product_id}`
      if (existingSet.has(key)) {
        errors.push(`app_id=${r.app_id} product_id=${r.product_id} 已存在，已跳过`)
        continue
      }
      toInsert.push(r)
      existingSet.add(key)
    }
    if (toInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: '所有记录均已存在，无需导入',
        data: { errors: errors.length ? errors : undefined }
      })
    }
    const sql = 'INSERT INTO app_products (app_id, app_name, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    let successCount = 0
    let errorCount = 0
    for (const r of toInsert) {
      try {
        await pool.execute(sql, [
          r.app_id,
          r.app_name,
          r.product_id,
          r.name,
          r.price,
          r.quantity
        ])
        successCount++
      } catch (e: unknown) {
        errorCount++
        errors.push(`插入失败 app_id=${r.app_id} product_id=${r.product_id}: ${(e as Error).message}`)
      }
    }
    return res.json({
      success: true,
      message: `导入完成: 成功 ${successCount} 条，失败 ${errorCount} 条`,
      data: { total: toInsert.length, success: successCount, failed: errorCount, errors: errors.length ? errors : undefined }
    })
  } catch (err) {
    console.error('POST /api/products/import error:', err)
    return res.status(500).json({ success: false, message: (err as Error).message ?? '导入失败' })
  }
})

/** 游戏档位管理：更新一条，需 token */
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'id 无效' })
    }
    const body = req.body ?? {}
    const { app_name: appName, name, price, quantity } = body
    const updates: string[] = []
    const params: Array<string | number> = []
    if (appName !== undefined) {
      updates.push('app_name = ?')
      params.push(String(appName).trim())
    }
    if (name !== undefined) {
      updates.push('name = ?')
      params.push(String(name).trim())
    }
    if (price !== undefined) {
      updates.push('price = ?')
      params.push(String(price).trim())
    }
    if (quantity !== undefined) {
      const q = Number(quantity)
      updates.push('quantity = ?')
      params.push(Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0)
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '无有效更新字段' })
    }
    params.push(id)
    await pool.execute(
      `UPDATE app_products SET ${updates.join(', ')} WHERE id = ?`,
      params
    )
    return res.status(200).json({ success: true, message: '更新成功' })
  } catch (err) {
    console.error('PUT /api/products/:id error:', err)
    return res.status(500).json({ success: false, message: (err as Error).message })
  }
})

/** 按 app_id 批量更新应用名称：同时更新 app_products 与 inventory 中该 app_id 下所有记录的 app_name，需 token */
router.patch('/app-name', verifyToken, async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {}
    const { app_id: appId, app_name: appName } = body
    if (!appId || String(appId).trim() === '') {
      return res.status(400).json({ success: false, message: 'app_id 不能为空' })
    }
    const appIdStr = String(appId).trim()
    const appNameStr = appName != null ? String(appName).trim() : ''

    const [appProductsResult] = await pool.execute(
      'UPDATE app_products SET app_name = ? WHERE app_id = ?',
      [appNameStr, appIdStr]
    )
    const appProductsAffected = (appProductsResult as { affectedRows?: number }).affectedRows ?? 0

    const [inventoryResult] = await pool.execute(
      'UPDATE inventory SET app_name = ? WHERE app_id = ?',
      [appNameStr, appIdStr]
    )
    const inventoryAffected = (inventoryResult as { affectedRows?: number }).affectedRows ?? 0

    return res.status(200).json({
      success: true,
      message: '应用名称已更新',
      data: { app_products_updated: appProductsAffected, inventory_updated: inventoryAffected }
    })
  } catch (err) {
    console.error('PATCH /api/products/app-name error:', err)
    return res.status(500).json({ success: false, message: (err as Error).message })
  }
})

/** 游戏档位管理：删除一条，需 token */
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'id 无效' })
    }
    const [result] = await pool.execute('DELETE FROM app_products WHERE id = ?', [id])
    const affectedRows = (result as { affectedRows?: number }).affectedRows ?? 0
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' })
    }
    return res.status(200).json({ success: true, message: '删除成功' })
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err)
    return res.status(500).json({ success: false, message: (err as Error).message })
  }
})

/** 采集商品信息并上传：由客户端/设备调用，将应用内购商品列表同步到 app_products，无需登录 token */
router.post('/collect', async (req: Request, res: Response) => {
  try {
    const { app_id: appId, app_name: appName, products } = req.body ?? {}
    console.log('/collect', req.body)

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('/collect products 为空')
      return res.status(200).json({ code: 1, message: 'products 为空' })
    }

    const appIdStr = appId != null ? String(appId).trim() : ''
    const appNameStr = appName != null ? String(appName).trim() : ''

    const sql = `INSERT INTO app_products (app_id, app_name, product_id, name, price, quantity)
                 VALUES (?, ?, ?, ?, ?, ?)`

    for (const p of products) {
      const productId = p?.product_id != null ? String(p.product_id).trim() : ''
      const name = p?.name != null ? String(p.name).trim() : ''
      const price = p?.price != null ? String(p.price).trim() : ''
      const q = p?.quantity
      const quantity = typeof q === 'number' && Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0

      // 同一 app_id + product_id 只保留一条，重复采集时跳过
      const [existing] = await pool.execute(
        'SELECT 1 FROM app_products WHERE app_id = ? AND product_id = ? LIMIT 1',
        [appIdStr, productId]
      )
      if (Array.isArray(existing) && existing.length > 0) {
        continue
      }
      await pool.execute(sql, [appIdStr, appNameStr, productId, name, price, quantity])
    }

    console.log('/collect success')

    return res.status(200).json({ code: 0, message: 'ok' })
  } catch (err) {
    console.error('POST /api/products/collect error:', err)
    return res.status(200).json({ code: 1, message: (err as Error).message || '采集失败' })
  }
})

/** 获取商品列表：供客户端按 app_id 拉取档位配置，无需 token */
router.post('/get', async (req: Request, res: Response) => {
  try {
    const { app_id: appId } = req.body ?? {}
    console.log('/get', req.body)
    const hasAppId = appId != null && String(appId).trim() !== ''

    const sql = hasAppId
      ? 'SELECT product_id, name, price, quantity, app_id, app_name FROM app_products WHERE app_id = ? ORDER BY id'
      : 'SELECT product_id, name, price, quantity, app_id, app_name FROM app_products ORDER BY id'
    const params = hasAppId ? [String(appId).trim()] : []

    const [rows] = await pool.execute(sql, params)
    const list =
      (rows as Array<{ product_id: string; name: string; price: string; quantity: number; app_id: string; app_name: string }>) ?? []

    const products = list.map((r) => ({
      product_id: r.product_id,
      name: r.name,
      price: r.price,
      quantity: r.quantity,
      app_id: r.app_id,
      app_name: r.app_name
    }))
    console.log('/get products', products)
    return res.status(200).json({ code: 0, message: 'Success', products })
  } catch (err) {
    console.error('POST /api/products/get error:', err)
    return res.status(200).json({ code: 1, message: (err as Error).message || '获取失败' })
  }
})

export default router
