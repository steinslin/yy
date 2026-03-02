import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  message,
  Modal,
  Descriptions,
  Tag,
  Tooltip,
  Typography,
  Upload,
  Checkbox,
  type UploadFile
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  UserOutlined,
  LogoutOutlined,
  FileTextOutlined,
  AppleOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
  SettingOutlined,
  ApartmentOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Home.css'

const { Header, Sider, Content } = Layout
const { RangePicker } = DatePicker

const Home = () => {
  const { logout, loading } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <div>加载中...</div>
      </div>
    )
  }

  // 搜索表单状态
  const [searchForm, setSearchForm] = useState({
    gameName: '',
    appId: '',
    tierName: '',
    status: undefined,
    inTimeRange: null as [any, any] | null,
    inAccount: '',
    inventoryNo: '',
    outDevice: ''
  })

  // 表格数据状态
  const [tableData, setTableData] = useState<any[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 详情弹窗状态
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailRecord, setDetailRecord] = useState<any>(null)

  // 选中的行（跨分页保留）
  const [selectedRows, setSelectedRows] = useState<Map<number, any>>(new Map())

  // 批量导出确认弹窗
  const [exportConfirmVisible, setExportConfirmVisible] = useState(false)
  const [exportSetOutbound, setExportSetOutbound] = useState(false)

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '游戏名称',
      dataIndex: 'game_name',
      key: 'game_name',
      width: 120
    },
    {
      title: '应用ID',
      dataIndex: 'app_id',
      key: 'app_id',
      width: 220
    },
    {
      title: '档位名称',
      dataIndex: 'tier_name',
      key: 'tier_name',
      width: 120
    },
    {
      title: '档位价格',
      dataIndex: 'tier_price',
      key: 'tier_price',
      width: 100,
      render: (price: number | string | null | undefined) => {
        const numPrice = price !== null && price !== undefined ? Number(price) : 0
        return `¥${isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)}`
      }
    },
    {
      title: '档位编码',
      dataIndex: 'tier_code',
      key: 'tier_code',
      width: 120
    },
    {
      title: '货币代码',
      dataIndex: 'currency_code',
      key: 'currency_code',
      width: 100
    },
    {
      title: '库存单号',
      dataIndex: 'inventory_no',
      key: 'inventory_no',
      width: 150,
      ellipsis: true,
      render: (val: string) => {
        if (val == null || val === '') return '-'
        const str = String(val)
        const short = str.length > 20 ? `${str.slice(0, 20)}...` : str
        return (
          <Tooltip title={str}>
            <span>{short}</span>
          </Tooltip>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        const statusConfig: Record<number, { text: string; color: string }> = {
          0: { text: '待出库', color: 'default' },
          1: { text: '出库中', color: 'processing' },
          2: { text: '出库失败', color: 'error' },
          3: { text: '出库成功', color: 'success' }
        }
        const config = statusConfig[status] ?? { text: '未知', color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => (time ? new Date(time).toLocaleString('zh-CN') : '-')
    },
    {
      title: '入库账户',
      dataIndex: 'in_account',
      key: 'in_account',
      width: 120
    },
    {
      title: '入库时间',
      dataIndex: 'in_time',
      key: 'in_time',
      width: 180,
      render: (time: string) => (time ? new Date(time).toLocaleString('zh-CN') : '-')
    },
    {
      title: '出库账户',
      dataIndex: 'out_account',
      key: 'out_account',
      width: 120
    },
    {
      title: '出库时间',
      dataIndex: 'out_time',
      key: 'out_time',
      width: 180,
      render: (time: string) => (time ? new Date(time).toLocaleString('zh-CN') : '-')
    },
    {
      title: '使用时间',
      dataIndex: 'used_time',
      key: 'used_time',
      width: 180,
      render: (time: string) => (time ? new Date(time).toLocaleString('zh-CN') : '-')
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true
    },
    {
      title: '入库设备',
      dataIndex: 'in_device',
      key: 'in_device',
      width: 150
    },
    {
      title: '出库设备',
      dataIndex: 'out_device',
      key: 'out_device',
      width: 150
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100
    },
    {
      title: '客户端凭证',
      dataIndex: 'new_receipt',
      key: 'new_receipt',
      width: 140,
      ellipsis: true,
      render: (val: string) => {
        if (val == null || val === '') return '-'
        const str = String(val)
        const short = str.length > 24 ? `${str.slice(0, 24)}...` : str
        return (
          <Tooltip title={<span style={{ wordBreak: 'break-all' }}>{str}</span>}>
            <Typography.Text copyable={{ text: str }} style={{ cursor: 'pointer' }}>
              {short}
            </Typography.Text>
          </Tooltip>
        )
      }
    },
    {
      title: '临时客户端凭证',
      dataIndex: 'receipt',
      key: 'receipt',
      width: 140,
      ellipsis: true,
      render: (val: string) => {
        if (val == null || val === '') return '-'
        const str = String(val)
        const short = str.length > 24 ? `${str.slice(0, 24)}...` : str
        return (
          <Tooltip title={<span style={{ wordBreak: 'break-all' }}>{str}</span>}>
            <Typography.Text copyable={{ text: str }} style={{ cursor: 'pointer' }}>
              {short}
            </Typography.Text>
          </Tooltip>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            handleViewDetail(record)
          }}
        >
          查看详情
        </Button>
      )
    }
  ]

  // 菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: '1',
      icon: <FileTextOutlined />,
      label: '凭证管理',
      onClick: () => navigate('/home')
    },
    {
      key: '2',
      icon: <AppleOutlined />,
      label: 'AppleID管理'
    },
    {
      key: '3',
      icon: <MobileOutlined />,
      label: '设备管理',
      onClick: () => navigate('/devices')
    },
    {
      key: '3-1',
      icon: <ApartmentOutlined />,
      label: '设备分组管理',
      onClick: () => navigate('/device-groups')
    },
    {
      key: '4',
      icon: <CheckCircleOutlined />,
      label: '任务管理'
    },
    {
      key: '5',
      icon: <PlayCircleOutlined />,
      label: '游戏档位管理',
      onClick: () => navigate('/game-tiers')
    },
    {
      key: '6',
      icon: <FileSearchOutlined />,
      label: '查看日志'
    },
    {
      key: '7',
      icon: <TeamOutlined />,
      label: '用户管理'
    },
    {
      key: '8',
      icon: <SettingOutlined />,
      label: '系统设置'
    }
  ]

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout()
        navigate('/login')
      }
    }
  ]

  // 获取库存数据
  const fetchInventoryData = async (page = 1, pageSize = 10) => {
    setTableLoading(true)
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize
      }

      if (searchForm.gameName) {
        params.game_name = searchForm.gameName
      }
      if (searchForm.appId) {
        params.app_id = searchForm.appId
      }
      if (searchForm.tierName) {
        params.tier_name = searchForm.tierName
      }
      if (searchForm.status !== undefined) {
        params.status = searchForm.status
      }
      if (searchForm.inAccount) {
        params.in_account = searchForm.inAccount
      }
      if (searchForm.inventoryNo) {
        params.inventory_no = searchForm.inventoryNo
      }
      if (searchForm.outDevice) {
        params.out_device = searchForm.outDevice
      }

      // 处理入库时间范围
      if (searchForm.inTimeRange && searchForm.inTimeRange.length === 2) {
        const startDate = searchForm.inTimeRange[0]
        const endDate = searchForm.inTimeRange[1]
        if (startDate != null) {
          params.in_time_start = String(dayjs(startDate).format('YYYY-MM-DD'))
        }
        if (endDate != null) {
          params.in_time_end = String(dayjs(endDate).format('YYYY-MM-DD'))
        }
      }

      const response = await api.get('/inventory', { params })
      if (response.data.success) {
        const list = response.data.data.list ?? []
        setTableData(list as any[])
        setPagination({
          current: response.data.data.pagination.current,
          pageSize: response.data.data.pagination.pageSize,
          total: response.data.data.pagination.total
        })
      } else {
        message.error((response.data.message ?? '获取数据失败') as string)
      }
    } catch (error: any) {
      console.error('获取库存数据失败:', error)
      const errorMessage = (error.response?.data?.message ??
        '获取库存数据失败，请稍后重试') as string
      message.error(errorMessage)
    } finally {
      setTableLoading(false)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchInventoryData(1, pagination.pageSize)
  }

  // 处理分页变化
  const handleTableChange = (page: number, pageSize: number) => {
    setPagination({ ...pagination, current: page, pageSize })
    fetchInventoryData(page, pageSize)
  }

  // 查看详情
  const handleViewDetail = (record: any) => {
    setDetailRecord(record)
    setDetailVisible(true)
  }

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setDetailVisible(false)
    setDetailRecord(null)
  }

  // 处理表格行选择变化
  const handleRowSelectionChange = (selectedRowKeys: React.Key[], selectedRowsData: any[]) => {
    const updatedMap = new Map(selectedRows)
    const currentPageIds = new Set(tableData.map((row: any) => row.id))

    // 移除当前页中未选中的项
    currentPageIds.forEach((id: number) => {
      if (!selectedRowKeys.includes(id)) {
        updatedMap.delete(id)
      }
    })

    // 添加当前页新选中的项
    selectedRowsData.forEach((row: any) => {
      if (row.id) {
        updatedMap.set(row.id, row)
      }
    })

    setSelectedRows(updatedMap)
  }

  // 批量导出（setOutbound: 导出是否将凭证状态设为出库成功）
  const handleBatchExport = async (setOutbound: boolean) => {
    try {
      let dataToExport: any[] = []

      if (selectedRows.size === 0) {
        // 如果没有选中项，导出所有数据
        message.loading('正在获取全部数据...', 0)
        try {
          // 构建搜索参数（使用当前的搜索条件）
          const params: Record<string, string | number> = {
            page: 1,
            pageSize: 10000 // 设置一个很大的值以获取所有数据
          }

          if (searchForm.gameName) {
            params.game_name = searchForm.gameName
          }
          if (searchForm.appId) {
            params.app_id = searchForm.appId
          }
          if (searchForm.tierName) {
            params.tier_name = searchForm.tierName
          }
          if (searchForm.status !== undefined) {
            params.status = searchForm.status
          }
          if (searchForm.inAccount) {
            params.in_account = searchForm.inAccount
          }
          if (searchForm.inventoryNo) {
            params.inventory_no = searchForm.inventoryNo
          }
          if (searchForm.outDevice) {
            params.out_device = searchForm.outDevice
          }

          // 处理入库时间范围
          if (searchForm.inTimeRange && searchForm.inTimeRange.length === 2) {
            const startDate = searchForm.inTimeRange[0]
            const endDate = searchForm.inTimeRange[1]
            if (startDate != null) {
              params.in_time_start = String(dayjs(startDate).format('YYYY-MM-DD'))
            }
            if (endDate != null) {
              params.in_time_end = String(dayjs(endDate).format('YYYY-MM-DD'))
            }
          }

          const response = await api.get('/inventory', { params })
          if (response.data.success) {
            dataToExport = response.data.data.list ?? []
          } else {
            message.destroy()
            message.error((response.data.message ?? '获取数据失败') as string)
            return
          }
        } catch (error: any) {
          message.destroy()
          console.error('获取全部数据失败:', error)
          const errorMessage = (error.response?.data?.message ??
            '获取数据失败，请稍后重试') as string
          message.error(errorMessage)
          return
        } finally {
          message.destroy()
        }
      } else {
        // 将选中的行转换为数组
        dataToExport = Array.from(selectedRows.values())
      }

      // 若用户选择导出后设为出库状态，则批量更新状态为 3（出库成功）
      if (setOutbound && dataToExport.length > 0) {
        const ids = dataToExport.map((row: any) => row.id).filter((id: any) => id != null)
        if (ids.length > 0) {
          try {
            await api.patch('/inventory/batch-status', { ids, status: 3 })
            message.success(`已将 ${ids.length} 条凭证状态更新为出库成功`)
            fetchInventoryData(pagination.current, pagination.pageSize)
          } catch (err: any) {
            console.error('批量更新状态失败:', err)
            message.error(err.response?.data?.message ?? '更新凭证状态失败，请稍后重试')
            return
          }
        }
      }

      // 定义 CSV 表头
      const headers = [
        'ID',
        '游戏名称',
        '应用ID',
        '档位名称',
        '档位价格',
        '档位编码',
        '货币代码',
        '库存单号',
        '状态',
        '创建时间',
        '入库账户',
        '入库时间',
        '出库账户',
        '出库时间',
        '使用时间',
        '备注',
        '入库设备',
        '出库设备',
        '类型'
      ]

      // 状态映射
      const statusMap: Record<number, string> = {
        0: '待出库',
        1: '出库中',
        2: '出库失败',
        3: '出库成功'
      }

      // 转换为 CSV 格式
      const csvRows = [
        headers.join(','),
        ...dataToExport.map((row: any) => {
          return [
            row.id ?? '',
            `"${(row.game_name ?? '').replace(/"/g, '""')}"`,
            `"${(row.app_id ?? '').replace(/"/g, '""')}"`,
            `"${(row.tier_name ?? '').replace(/"/g, '""')}"`,
            row.tier_price ?? '',
            `"${(row.tier_code ?? '').replace(/"/g, '""')}"`,
            `"${(row.currency_code ?? '').replace(/"/g, '""')}"`,
            `"${(row.inventory_no ?? '').replace(/"/g, '""')}"`,
            statusMap[row.status] ?? '未知',
            row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '',
            `"${(row.in_account ?? '').replace(/"/g, '""')}"`,
            row.in_time ? new Date(row.in_time).toLocaleString('zh-CN') : '',
            `"${(row.out_account ?? '').replace(/"/g, '""')}"`,
            row.out_time ? new Date(row.out_time).toLocaleString('zh-CN') : '',
            row.used_time ? new Date(row.used_time).toLocaleString('zh-CN') : '',
            `"${(row.remark ?? '').replace(/"/g, '""')}"`,
            `"${(row.in_device ?? '').replace(/"/g, '""')}"`,
            `"${(row.out_device ?? '').replace(/"/g, '""')}"`,
            `"${(row.type ?? '').replace(/"/g, '""')}"`
          ].join(',')
        })
      ]

      // 创建 Blob 并下载
      const csvContent = '\uFEFF' + csvRows.join('\n') // 添加 BOM 以支持中文
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `凭证数据_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      message.success(`成功导出 ${dataToExport.length} 条数据`)
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败，请稍后重试')
    } finally {
      setExportConfirmVisible(false)
      setExportSetOutbound(false)
    }
  }

  // 打开批量导出确认弹窗
  const handleBatchExportClick = () => {
    setExportSetOutbound(false)
    setExportConfirmVisible(true)
  }

  // 批量导入
  const handleBatchImport = () => {
    // 触发文件选择
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      // 验证文件类型
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        message.error('只支持上传 Excel 文件 (.xlsx, .xls)')
        return
      }

      // 验证文件大小（10MB）
      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const hide = message.loading('正在导入数据...', 0)

      try {
        const response = await api.post('/inventory/import', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        hide()

        if (response.data.success) {
          const { success, failed, errors } = response.data.data
          if (failed === 0) {
            message.success(`成功导入 ${success} 条数据`)
          } else {
            message.warning(
              `导入完成: 成功 ${success} 条，失败 ${failed} 条${
                errors && errors.length > 0 ? `\n错误详情: ${errors.slice(0, 5).join('; ')}` : ''
              }`
            )
          }
          // 刷新表格数据
          fetchInventoryData(pagination.current, pagination.pageSize)
        } else {
          message.error(response.data.message ?? '导入失败')
        }
      } catch (error: any) {
        hide()
        console.error('导入失败:', error)
        const errorMessage = error.response?.data?.message ?? '导入失败，请稍后重试'
        message.error(errorMessage)
      }
    }
    input.click()
  }

  // 重置搜索
  const handleReset = () => {
    setSearchForm({
      gameName: '',
      appId: '',
      tierName: '',
      status: undefined,
      inTimeRange: null,
      inAccount: '',
      inventoryNo: '',
      outDevice: ''
    })
    setPagination({ ...pagination, current: 1 })
    // 重置后重新加载数据
    setTimeout(() => {
      fetchInventoryData(1, pagination.pageSize)
    }, 0)
  }

  // 页面加载时获取数据
  useEffect(() => {
    fetchInventoryData(1, 10)
  }, [])

  return (
    <Layout className="home-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        className="home-sider"
      >
        <div className="logo">
          <h2>{collapsed ? '云' : '云充值'}</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={menuItems}
          className="home-menu"
        />
      </Sider>
      <Layout>
        <Header className="home-header" style={{ left: collapsed ? 80 : 200 }}>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="home-content" style={{ marginLeft: collapsed ? 80 : 200 }}>
          <div className="content-wrapper">
            <div className="search-section">
              <h3>搜索条件</h3>
              <div className="search-form">
                <div className="search-form-row">
                  <div className="search-form-item">
                    <label className="search-label">游戏名称</label>
                    <Input
                      placeholder="请输入游戏名称"
                      value={searchForm.gameName}
                      onChange={e => {
                        setSearchForm({ ...searchForm, gameName: e.target.value })
                      }}
                      style={{ width: 288 }}
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">应用ID</label>
                    <Input
                      placeholder="请输入应用ID"
                      value={searchForm.appId}
                      onChange={e => {
                        setSearchForm({ ...searchForm, appId: e.target.value })
                      }}
                      style={{ width: 288 }}
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">档位名称</label>
                    <Input
                      placeholder="请输入档位名称"
                      value={searchForm.tierName}
                      onChange={e => {
                        setSearchForm({ ...searchForm, tierName: e.target.value })
                      }}
                      style={{ width: 288 }}
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">状态</label>
                    <Select
                      placeholder="请选择状态"
                      value={searchForm.status}
                      onChange={value => {
                        setSearchForm({ ...searchForm, status: value })
                      }}
                      style={{ width: 288 }}
                      allowClear
                    >
                      <Select.Option value={0}>待出库</Select.Option>
                      <Select.Option value={1}>出库中</Select.Option>
                      <Select.Option value={2}>出库失败</Select.Option>
                      <Select.Option value={3}>出库成功</Select.Option>
                    </Select>
                  </div>
                </div>
                <div className="search-form-row">
                  <div className="search-form-item">
                    <label className="search-label">入库时间</label>
                    <RangePicker
                      placeholder={['开始时间', '结束时间']}
                      value={searchForm.inTimeRange}
                      onChange={(dates: any) => {
                        setSearchForm({ ...searchForm, inTimeRange: dates })
                      }}
                      style={{ width: 288 }}
                      format="YYYY-MM-DD"
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">入库账号</label>
                    <Input
                      placeholder="请输入入库账号"
                      value={searchForm.inAccount}
                      onChange={e => {
                        setSearchForm({ ...searchForm, inAccount: e.target.value })
                      }}
                      style={{ width: 288 }}
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">库存ID</label>
                    <Input
                      placeholder="请输入库存ID"
                      value={searchForm.inventoryNo}
                      onChange={e => {
                        setSearchForm({ ...searchForm, inventoryNo: e.target.value })
                      }}
                      style={{ width: 288 }}
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">出库设备</label>
                    <Input
                      placeholder="请输入出库设备"
                      value={searchForm.outDevice}
                      onChange={e => {
                        setSearchForm({ ...searchForm, outDevice: e.target.value })
                      }}
                      style={{ width: 288 }}
                    />
                  </div>
                </div>
                <div className="batch-operations">
                  <div className="batch-buttons">
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={handleBatchImport}
                      style={{
                        marginRight: 12,
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a',
                        color: '#fff'
                      }}
                    >
                      批量导入
                    </Button>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleBatchExportClick}
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                    >
                      批量导出 {selectedRows.size > 0 ? `(${selectedRows.size})` : '(全部)'}
                    </Button>
                  </div>
                  <div className="search-buttons">
                    <Button type="primary" onClick={handleSearch}>
                      搜索
                    </Button>
                    <Button onClick={handleReset}>重置</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="content-main">
              {/* 表格区域 */}
              <div className="table-section">
                <Table
                  columns={columns}
                  dataSource={tableData}
                  rowKey="id"
                  loading={tableLoading}
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: Array.from(selectedRows.keys()).filter((id: number) =>
                      tableData.some((row: any) => row.id === id)
                    ),
                    onChange: handleRowSelectionChange,
                    preserveSelectedRowKeys: true
                  }}
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    showTotal: total => `共 ${total} 条`,
                    onChange: handleTableChange,
                    onShowSizeChange: handleTableChange
                  }}
                  scroll={{ x: 2400 }}
                />
              </div>
            </div>
          </div>
        </Content>
      </Layout>

      {/* 批量导出确认弹窗 */}
      <Modal
        title="确认批量导出"
        open={exportConfirmVisible}
        onCancel={() => {
          setExportConfirmVisible(false)
          setExportSetOutbound(false)
        }}
        onOk={async () => {
          await handleBatchExport(exportSetOutbound)
        }}
        okText="确认导出"
        cancelText="取消"
      >
        <p style={{ marginBottom: 12 }}>
          即将导出 {selectedRows.size > 0 ? selectedRows.size : '全部'} 条数据，是否继续？
        </p>
        <Checkbox
          checked={exportSetOutbound}
          onChange={e => setExportSetOutbound(e.target.checked)}
        >
          导出后将凭证状态设置为出库成功
        </Checkbox>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="凭证详情"
        open={detailVisible}
        onCancel={handleCloseDetail}
        footer={[
          <Button key="close" onClick={handleCloseDetail}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {detailRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="游戏名称">{detailRecord.game_name ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="应用ID">{detailRecord.app_id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="档位名称">{detailRecord.tier_name ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="档位价格">
              {detailRecord.tier_price ? `¥${Number(detailRecord.tier_price).toFixed(2)}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="档位编码">{detailRecord.tier_code ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="货币代码">
              {detailRecord.currency_code ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="库存单号" span={2}>
              {detailRecord.inventory_no ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {(() => {
                const statusMap: Record<number, string> = {
                  0: '待出库',
                  1: '出库中',
                  2: '出库失败',
                  3: '出库成功'
                }
                return statusMap[detailRecord.status] ?? '未知'
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="类型">{detailRecord.type ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {detailRecord.created_at
                ? new Date(detailRecord.created_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="入库账户">{detailRecord.in_account ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="入库时间">
              {detailRecord.in_time ? new Date(detailRecord.in_time).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="出库账户">
              {detailRecord.out_account ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="出库时间">
              {detailRecord.out_time
                ? new Date(detailRecord.out_time).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="使用时间">
              {detailRecord.used_time
                ? new Date(detailRecord.used_time).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="入库设备">{detailRecord.in_device ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="出库设备">{detailRecord.out_device ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detailRecord.remark ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="客户端凭证" span={2}>
              {detailRecord.new_receipt != null && detailRecord.new_receipt !== '' ? (
                <Typography.Text copyable style={{ wordBreak: 'break-all', display: 'block', maxHeight: 120, overflow: 'auto' }}>
                  {detailRecord.new_receipt}
                </Typography.Text>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="临时客户端凭证" span={2}>
              {detailRecord.receipt != null && detailRecord.receipt !== '' ? (
                <Typography.Text copyable style={{ wordBreak: 'break-all', display: 'block', maxHeight: 120, overflow: 'auto' }}>
                  {detailRecord.receipt}
                </Typography.Text>
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Layout>
  )
}

export default Home
