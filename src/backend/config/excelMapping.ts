/**
 * Excel 文件字段映射配置
 * 用于将用户上传的 Excel 文件中的列映射到数据库字段
 */

/**
 * Excel 日期序列号：1 = 1900-01-01，小数部分为当天时间。xlsx 读出的日期可能是该数字，
 * 若直接用 new Date(num) 会被当成“1970 年起的毫秒数”导致变成 1970 年。
 */
const EXCEL_EPOCH = new Date(1899, 11, 31).getTime()
const MS_PER_DAY = 86400 * 1000

function parseExcelOrJsDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    // Excel 序列号范围约 1~百万（1900-01-01 到约 2237 年），且用 new Date(num) 会得到 1970 年左右
    if (value >= 1 && value < 1000000) {
      const jsTime = EXCEL_EPOCH + value * MS_PER_DAY
      const date = new Date(jsTime)
      return isNaN(date.getTime()) ? null : date
    }
  }
  const date = new Date(value as string | number)
  return isNaN(date.getTime()) ? null : date
}

/** 将日期值格式化为本地时间 'YYYY-MM-DD HH:mm:ss'，支持 Excel 序列号与字符串/Date */
function formatDateTimeLocal(value: unknown): string | null {
  const date = parseExcelOrJsDate(value)
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

export interface ExcelColumnMapping {
  // Excel 列名（用户上传文件中的列名）
  excelColumn: string
  // 数据库字段名
  dbField: string
  // 是否必填
  required?: boolean
  // 数据类型转换函数
  transform?: (value: any) => any
  // 默认值
  defaultValue?: any
}

// 字段映射配置
export const inventoryExcelMapping: ExcelColumnMapping[] = [
  {
    excelColumn: '游戏名称',
    dbField: 'app_name',
    required: true
  },
  {
    excelColumn: '应用ID',
    dbField: 'app_id',
    required: true
  },
  {
    excelColumn: '档位名称',
    dbField: 'tier_name',
    required: true
  },
  {
    excelColumn: '档位价格',
    dbField: 'tier_price',
    required: true,
    transform: (value: any) => {
      const num = Number(value)
      return isNaN(num) ? 0 : num
    }
  },
  {
    excelColumn: '档位编码',
    dbField: 'tier_code',
    required: true
  },
  {
    excelColumn: '货币代码',
    dbField: 'currency_code',
    defaultValue: 'CNY'
  },
  {
    excelColumn: '库存单号',
    dbField: 'transaction_id',
    required: true
  },
  {
    excelColumn: '状态',
    dbField: 'status',
    defaultValue: 0,
    // Excel 中可能是中文或数字，统一转为 0~3
    transform: (value: any) => {
      if (typeof value === 'string') {
        const statusMap: Record<string, number> = {
          待出库: 0,
          出库中: 1,
          出库失败: 2,
          出库成功: 3
        }
        return statusMap[value] ?? 0
      }
      return Number(value) ?? 0
    }
  },
  {
    excelColumn: '入库账户',
    dbField: 'in_account'
  },
  {
    excelColumn: '入库时间',
    dbField: 'in_time',
    // 使用本地时间格式化，避免 toISOString() 的 UTC 时区偏差
    transform: (value: any) => formatDateTimeLocal(value)
  },
  {
    excelColumn: '出库账户',
    dbField: 'out_account'
  },
  {
    excelColumn: '出库时间',
    dbField: 'out_time',
    transform: (value: any) => formatDateTimeLocal(value)
  },
  {
    excelColumn: '使用时间',
    dbField: 'used_time',
    transform: (value: any) => formatDateTimeLocal(value)
  },
  {
    excelColumn: '备注',
    dbField: 'remark'
  },
  {
    excelColumn: '入库设备',
    dbField: 'in_device'
  },
  {
    excelColumn: '出库设备',
    dbField: 'out_device'
  },
  {
    excelColumn: '客户端凭证',
    dbField: 'new_receipt'
  },
  {
    excelColumn: '临时客户端凭证',
    dbField: 'receipt'
  }
]

/**
 * 根据 Excel 列名获取数据库字段名
 */
export function getDbFieldByExcelColumn(excelColumn: string): string | undefined {
  const mapping = inventoryExcelMapping.find(m => m.excelColumn === excelColumn)
  return mapping?.dbField
}

/**
 * 获取所有必填字段
 */
export function getRequiredFields(): string[] {
  return inventoryExcelMapping.filter(m => m.required).map(m => m.excelColumn)
}
