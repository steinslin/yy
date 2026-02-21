/**
 * Excel 文件字段映射配置
 * 用于将用户上传的 Excel 文件中的列映射到数据库字段
 */

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
    dbField: 'game_name',
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
    dbField: 'inventory_no',
    required: true
  },
  {
    excelColumn: '状态',
    dbField: 'status',
    defaultValue: 0,
    transform: (value: any) => {
      if (typeof value === 'string') {
        const statusMap: Record<string, number> = {
          待入库: 0,
          已入库: 1,
          已出库: 2,
          已使用: 3,
          已取消: 4
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
    transform: (value: any) => {
      if (!value) return null
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ')
    }
  },
  {
    excelColumn: '出库账户',
    dbField: 'out_account'
  },
  {
    excelColumn: '出库时间',
    dbField: 'out_time',
    transform: (value: any) => {
      if (!value) return null
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ')
    }
  },
  {
    excelColumn: '使用时间',
    dbField: 'used_time',
    transform: (value: any) => {
      if (!value) return null
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ')
    }
  },
  {
    excelColumn: '备注',
    dbField: 'remark'
  },
  {
    excelColumn: '入库TRACE ID',
    dbField: 'in_trace_id'
  },
  {
    excelColumn: '出库TRACE ID',
    dbField: 'out_trace_id'
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
    excelColumn: '类型',
    dbField: 'type'
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
