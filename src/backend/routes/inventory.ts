import express, { type Request, type Response } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import pool from '../config/database'
import { verifyToken } from './auth'
import {
  inventoryExcelMapping,
  getRequiredFields,
  type ExcelColumnMapping
} from '../config/excelMapping'

const router = express.Router()

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持上传 Excel 文件 (.xlsx, .xls)'))
    }
  }
})

// 获取库存列表（支持分页和搜索）
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      app_name: appName,
      app_id: appId,
      tier_name: tierName,
      status,
      in_account: inAccount,
      inventory_no: inventoryNo,
      out_device: outDevice,
      in_time_start: inTimeStart,
      in_time_end: inTimeEnd
    } = req.query

    // 打印所有请求参数
    console.log('=== 库存查询请求参数 ===')
    console.log('原始查询参数:', JSON.stringify(req.query, null, 2))
    console.log('解析后的参数:')
    console.log('  - page:', page)
    console.log('  - pageSize:', pageSize)
    console.log('  - appName:', appName)
    console.log('  - appId:', appId)
    console.log('  - tierName:', tierName)
    console.log('  - status:', status, '(type:', typeof status, ')')
    console.log('  - inAccount:', inAccount)
    console.log('  - inventoryNo:', inventoryNo)
    console.log('  - outDevice:', outDevice)
    console.log('  - inTimeStart:', inTimeStart)
    console.log('  - inTimeEnd:', inTimeEnd)
    console.log('========================')

    const currentPage = Number(page) || 1
    const limit = Number(pageSize) || 10
    const offset = (currentPage - 1) * limit

    console.log('计算后的分页参数:')
    console.log('  - currentPage:', currentPage)
    console.log('  - limit:', limit)
    console.log('  - offset:', offset)

    // 构建查询条件
    const conditions: string[] = []
    const params: any[] = []

    if (appName && String(appName).trim()) {
      conditions.push('app_name LIKE ?')
      params.push(`%${String(appName).trim()}%`)
    }

    if (appId && String(appId).trim()) {
      conditions.push('app_id LIKE ?')
      params.push(`%${String(appId).trim()}%`)
    }

    if (tierName && String(tierName).trim()) {
      conditions.push('tier_name LIKE ?')
      params.push(`%${String(tierName).trim()}%`)
    }

    if (status !== undefined && status !== '' && status !== null) {
      conditions.push('status = ?')
      params.push(Number(status))
    }

    if (inAccount && String(inAccount).trim()) {
      conditions.push('in_account LIKE ?')
      params.push(`%${String(inAccount).trim()}%`)
    }

    if (inventoryNo && String(inventoryNo).trim()) {
      conditions.push('transaction_id LIKE ?')
      params.push(`%${String(inventoryNo).trim()}%`)
    }

    if (outDevice && String(outDevice).trim()) {
      conditions.push('out_device LIKE ?')
      params.push(`%${String(outDevice).trim()}%`)
    }

    if (inTimeStart && String(inTimeStart).trim()) {
      conditions.push('DATE(in_time) >= ?')
      params.push(String(inTimeStart).trim())
    }
    if (inTimeEnd && String(inTimeEnd).trim()) {
      conditions.push('DATE(in_time) <= ?')
      params.push(String(inTimeEnd).trim())
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    console.log('构建的查询条件:')
    console.log('  - conditions:', conditions)
    console.log('  - params:', params)
    console.log('  - whereClause:', whereClause)

    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM inventory ${whereClause}`
    const [countResult] = (await pool.execute(countQuery, params)) as unknown as [
      Array<{ total: number }>
    ]

    const total = countResult[0]?.total ?? 0

    // 查询数据：LIMIT/OFFSET 用已校验的 safeLimit、safeOffset 拼接到 SQL 中（mysql2 对 LIMIT 占位符兼容性不佳，故不用 ?）
    const safeLimit = Math.max(1, Math.floor(Number(limit)) || 10)
    const safeOffset = Math.max(0, Math.floor(Number(offset)) || 0)

    const dataQuery = `SELECT * FROM inventory ${whereClause} ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`

    console.log('执行数据查询:')
    console.log('  - SQL:', dataQuery)
    console.log('  - params:', params)
    console.log('  - params length:', params.length)
    console.log('  - limit:', safeLimit, '(type:', typeof safeLimit, ')')
    console.log('  - offset:', safeOffset, '(type:', typeof safeOffset, ')')

    const [rows] = (await pool.execute(dataQuery, params)) as unknown as [any[]]

    console.log('查询结果:')
    console.log('  - 总记录数:', total)
    console.log('  - 返回记录数:', rows.length)

    res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          current: currentPage,
          pageSize: limit,
          total
        }
      }
    })
  } catch (error) {
    console.error('获取库存列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取库存列表失败'
    })
  }
})

// 批量导入接口
router.post('/import', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      })
    }

    // 解析 Excel 文件
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // 转换为 JSON 格式
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null })

    if (rawData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel 文件至少需要包含表头和数据行'
      })
    }

    // 第一行是表头
    const headers = rawData[0] as string[]
    const dataRows = rawData.slice(1) as any[][]

    console.log('headers', headers)

    // 验证表头是否包含必填字段
    const requiredFields = getRequiredFields()
    const missingFields = requiredFields.filter(
      field => !headers.some(h => String(h).trim() === field)
    )

    console.log('missingFields', missingFields)

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `缺少必填字段: ${missingFields.join(', ')}`
      })
    }

    // 构建「表头列名 -> 数据库字段」的列索引：Excel 第几列对应哪个 db 字段，后续按 dbField 取 row[columnIndex]
    const columnIndexMap: Record<string, number> = {}
    headers.forEach((header, index) => {
      const headerStr = String(header).trim()
      const mapping = inventoryExcelMapping.find(m => m.excelColumn === headerStr)
      if (mapping) {
        columnIndexMap[mapping.dbField] = index
      }
    })

    // 逐行解析：按映射取值、做 transform、补默认值，校验必填与凭证非空后加入 insertData
    // 注意：new_receipt/receipt 为空的行会跳过并记入 errors，不导入
    const insertData: any[] = []
    const errors: string[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNum = i + 2 // Excel 行号（从2开始，因为第1行是表头）

      // 跳过空行
      if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
        continue
      }

      const record: Record<string, any> = {}

      // 按 excelMapping 配置：从 row[列下标] 取原始值 → transform（如状态中文转数字、日期格式）→ 空且非必填时用 defaultValue
      for (const mapping of inventoryExcelMapping) {
        const columnIndex = columnIndexMap[mapping.dbField]
        if (columnIndex !== undefined && columnIndex < row.length) {
          let value = row[columnIndex]
          if (mapping.transform && value !== null && value !== undefined) {
            value = mapping.transform(value)
          }
          if (
            (value === null || value === undefined || String(value).trim() === '') &&
            !mapping.required
          ) {
            value = mapping.defaultValue ?? null
          }
          record[mapping.dbField] = value
        } else if (mapping.defaultValue !== undefined) {
          record[mapping.dbField] = mapping.defaultValue
        }
      }

      // 验证必填字段
      const missingRequired: string[] = []
      for (const mapping of inventoryExcelMapping) {
        if (mapping.required) {
          const value = record[mapping.dbField]
          if (value === null || value === undefined || String(value).trim() === '') {
            missingRequired.push(mapping.excelColumn)
          }
        }
      }

      if (missingRequired.length > 0) {
        errors.push(`第 ${rowNum} 行缺少必填字段: ${missingRequired.join(', ')}`)
        continue
      }

      // new_receipt、receipt 不能为空，否则不导入该行
      const newReceiptVal = record.new_receipt != null ? String(record.new_receipt).trim() : ''
      const receiptVal = record.receipt != null ? String(record.receipt).trim() : ''
      if (newReceiptVal === '' || receiptVal === '') {
        errors.push(`第 ${rowNum} 行 new_receipt 或 receipt 为空，已跳过`)
        continue
      }
      record.new_receipt = newReceiptVal
      record.receipt = receiptVal

      // 库存单号对应 transaction_id，不允许为空，不进行导入
      if (!record.transaction_id || String(record.transaction_id).trim() === '') {
        errors.push(`第 ${rowNum} 行库存单号(transaction_id)不能为空，已跳过`)
        continue
      }

      insertData.push(record)
    }

    if (errors.length > 0 && insertData.length === 0) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors
      })
    }

    // 批量插入数据
    if (insertData.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的数据可导入'
      })
    }

    // 构建批量插入 SQL
    const fields = Object.keys(insertData[0])
    const placeholders = fields.map(() => '?').join(', ')
    const values = insertData.map(record => fields.map(field => record[field]))

    // INSERT IGNORE：若 transaction_id 已存在则跳过该行（需表上有唯一约束时生效）
    const sql = `INSERT IGNORE INTO inventory (${fields.join(', ')}) VALUES (${placeholders})`

    let successCount = 0
    let errorCount = 0

    // 逐条执行以便区分成功/失败条数并收集 ER_DUP_ENTRY 等错误信息
    for (const record of insertData) {
      try {
        const recordValues = fields.map(field => record[field])
        await pool.execute(sql, recordValues)
        successCount++
      } catch (error: any) {
        errorCount++
        console.error('插入数据失败:', error)
        if (error.code === 'ER_DUP_ENTRY') {
          errors.push(`库存单号(transaction_id) ${record.transaction_id} 已存在`)
        } else {
          errors.push(`插入数据失败: ${error.message}`)
        }
      }
    }

    res.json({
      success: true,
      message: `导入完成: 成功 ${successCount} 条，失败 ${errorCount} 条`,
      data: {
        total: insertData.length,
        success: successCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    })
  } catch (error: any) {
    console.error('导入失败:', error)
    res.status(500).json({
      success: false,
      message: error.message ?? '导入失败，请稍后重试'
    })
  }
})

// 批量更新凭证状态：常用于「导出选中凭证后」将这批记录标记为出库成功(3)，并写入 out_time、out_account、remark
router.patch('/batch-status', verifyToken, async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body as { ids?: number[]; status?: number }
    if (!Array.isArray(ids) || ids.length === 0 || status === undefined || status === null) {
      return res.status(400).json({
        success: false,
        message: '请提供 ids 数组和 status'
      })
    }
    const safeStatus = Number(status)
    if (!Number.isInteger(safeStatus) || safeStatus < 0 || safeStatus > 3) {
      return res.status(400).json({
        success: false,
        message: 'status 必须为 0-3 的整数'
      })
    }
    const currentUser = (req as any).user
    const outAccount = currentUser?.username ?? 'system'
    const remark = '批量导出'
    const placeholders = ids.map(() => '?').join(', ')
    const sql = `UPDATE inventory SET status = ?, out_time = NOW(), out_account = ?, remark = ? WHERE id IN (${placeholders})`
    const [result] = (await pool.execute(sql, [safeStatus, outAccount, remark, ...ids])) as unknown as [
      { affectedRows: number }
    ]
    const affectedRows = (result as any)?.affectedRows ?? 0
    res.json({
      success: true,
      data: { updated: affectedRows },
      message: `已更新 ${affectedRows} 条凭证状态`
    })
  } catch (error: any) {
    console.error('批量更新状态失败:', error)
    res.status(500).json({
      success: false,
      message: error.message ?? '批量更新状态失败'
    })
  }
})

export default router
