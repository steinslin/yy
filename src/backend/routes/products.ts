import express, { type Request, type Response } from 'express'
import pool from '../config/database'

const router = express.Router()

/** 采集商品信息并上传至服务器，无需 token */
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

      // 根据 app_id + product_id 判断是否已存在，存在则跳过
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

/** 获取商品信息列表，可选 app_id 过滤，无需 token */
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
    const list = (rows as { product_id: string; name: string; price: string; quantity: number; app_id: string; app_name: string }[]) ?? []

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
