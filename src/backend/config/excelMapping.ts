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
    dbField: 'inventory_no',
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
    // Excel 日期可能是 Date 或字符串，转为 MySQL 可用的 'YYYY-MM-DD HH:mm:ss'
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
