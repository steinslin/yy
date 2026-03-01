import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Input,
  Button,
  Table,
  message,
  Modal,
  Form,
  Popconfirm,
  DatePicker,
  type MenuProps
} from 'antd'
import dayjs from 'dayjs'
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
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Home.css'

const { Header, Sider, Content } = Layout

interface AppProductRecord {
  id: number
  app_id: string
  app_name: string
  product_id: string
  name: string
  price: string
  quantity: number
  created_at?: string
  updated_at?: string
}

interface AppGroupRecord {
  app_id: string
  app_name: string
  tier_count: number
  updated_at?: string
  tiers: AppProductRecord[]
}

const GameTierManage = () => {
  const { logout, loading } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [productList, setProductList] = useState<AppProductRecord[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [searchAppId, setSearchAppId] = useState('')
  const [searchAppName, setSearchAppName] = useState('')
  const [searchTimeRange, setSearchTimeRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AppProductRecord | null>(null)
  const [form] = Form.useForm()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>加载中...</div>
      </div>
    )
  }

  const menuItems: MenuProps['items'] = [
    { key: '1', icon: <FileTextOutlined />, label: '凭证管理', onClick: () => navigate('/home') },
    { key: '2', icon: <AppleOutlined />, label: 'AppleID管理' },
    { key: '3', icon: <MobileOutlined />, label: '设备管理', onClick: () => navigate('/devices') },
    { key: '4', icon: <CheckCircleOutlined />, label: '任务管理' },
    { key: '5', icon: <PlayCircleOutlined />, label: '游戏档位管理' },
    { key: '6', icon: <FileSearchOutlined />, label: '查看日志' },
    { key: '7', icon: <TeamOutlined />, label: '用户管理' },
    { key: '8', icon: <SettingOutlined />, label: '系统设置' }
  ]

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

  const fetchList = async () => {
    setTableLoading(true)
    try {
      // 这里按 app_id 分组展示（父表是“游戏/应用”），所以一次拉取较多数据后前端分组。
      const params: Record<string, string | number> = { page: 1, pageSize: 5000 }
      if (searchAppId.trim()) params.app_id = searchAppId.trim()
      if (searchAppName.trim()) params.app_name = searchAppName.trim()
      if (searchTimeRange && searchTimeRange[0]) params.created_at_start = searchTimeRange[0].format('YYYY-MM-DD')
      if (searchTimeRange && searchTimeRange[1]) params.created_at_end = searchTimeRange[1].format('YYYY-MM-DD')
      const res = await api.get('/products', { params })
      const data = res.data?.data
      if (res.data?.success && data) {
        setProductList((data.list as AppProductRecord[]) ?? [])
        setPagination((p) => ({ ...p, current: 1 }))
      } else {
        message.error((res.data?.message as string) ?? '获取列表失败')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '获取列表失败'
      message.error(msg)
    } finally {
      setTableLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleSearch = () => fetchList()
  const handleReset = () => {
    setSearchAppId('')
    setSearchAppName('')
    setSearchTimeRange(null)
    setTimeout(() => fetchList(), 0)
  }

  const openAdd = (preset?: { app_id?: string; app_name?: string }) => {
    setEditingRecord(null)
    form.setFieldsValue({
      app_id: preset?.app_id ?? '',
      app_name: preset?.app_name ?? '',
      product_id: '',
      name: '',
      price: '',
      quantity: 0
    })
    setModalVisible(true)
  }

  const openEdit = (record: AppProductRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      app_id: record.app_id,
      app_name: record.app_name ?? '',
      product_id: record.product_id,
      name: record.name ?? '',
      price: record.price ?? '',
      quantity: record.quantity ?? 0
    })
    setModalVisible(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      if (editingRecord) {
        await api.put(`/products/${editingRecord.id}`, {
          app_name: values.app_name,
          name: values.name,
          price: values.price,
          quantity: values.quantity
        })
        message.success('更新成功')
      } else {
        await api.post('/products', {
          app_id: values.app_id,
          app_name: values.app_name,
          product_id: values.product_id,
          name: values.name,
          price: values.price,
          quantity: values.quantity ?? 0
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchList()
    } catch (e) {
      if (e instanceof Error && e.message) message.error(e.message)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/products/${id}`)
      message.success('删除成功')
      fetchList()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '删除失败'
      message.error(msg)
    }
  }

  const groupList: AppGroupRecord[] = useMemo(() => {
    const map = new Map<string, AppGroupRecord>()
    for (const r of productList) {
      const key = r.app_id ?? ''
      if (!key) continue
      const prev = map.get(key)
      const appName = (r.app_name ?? '').trim()
      const updatedAt = r.updated_at ?? r.created_at
      if (!prev) {
        map.set(key, {
          app_id: key,
          app_name: appName,
          tier_count: 1,
          updated_at: updatedAt,
          tiers: [r]
        })
      } else {
        prev.tiers.push(r)
        prev.tier_count += 1
        if (!prev.app_name && appName) prev.app_name = appName
        if (updatedAt && (!prev.updated_at || String(updatedAt) > String(prev.updated_at))) {
          prev.updated_at = updatedAt
        }
      }
    }
    const list = Array.from(map.values())
    list.sort((a, b) => a.app_id.localeCompare(b.app_id))
    // 子表按 product_id 排序更直观
    for (const g of list) {
      g.tiers.sort((a, b) => String(a.product_id ?? '').localeCompare(String(b.product_id ?? '')))
    }
    return list
  }, [productList])

  const pagedGroups = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    return groupList.slice(start, end)
  }, [groupList, pagination.current, pagination.pageSize])

  const tierColumns: ColumnsType<AppProductRecord> = [
    { title: '商品ID', dataIndex: 'product_id', key: 'product_id', width: 140 },
    { title: '档位名称', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
    { title: '价格', dataIndex: 'price', key: 'price', width: 90 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (t: string) => (t ? new Date(t).toLocaleString('zh-CN') : '-')
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该档位吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </>
      )
    }
  ]

  const groupColumns: ColumnsType<AppGroupRecord> = [
    { title: '应用ID', dataIndex: 'app_id', key: 'app_id', width: 260, ellipsis: true },
    { title: '应用名称', dataIndex: 'app_name', key: 'app_name', width: 160, ellipsis: true, render: (v: string) => (v ? v : '-') },
    { title: '档位数量', dataIndex: 'tier_count', key: 'tier_count', width: 100 },
    {
      title: '最后更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (t: string) => (t ? new Date(t).toLocaleString('zh-CN') : '-')
    },
    // {
    //   title: '操作',
    //   key: 'action',
    //   width: 140,
    //   fixed: 'right',
    //   render: (_, record) => (
    //     <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openAdd({ app_id: record.app_id, app_name: record.app_name })}>
    //       新增档位
    //     </Button>
    //   )
    // }
  ]

  return (
    <Layout className="home-layout">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={200} className="home-sider">
        <div className="logo">
          <h2>{collapsed ? '云' : '云充值'}</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['5']}
          selectedKeys={['5']}
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
              <h3>游戏档位管理</h3>
              <div className="search-form">
                <div className="search-form-row">
                  <div className="search-form-item">
                    <label className="search-label">应用ID</label>
                    <Input
                      placeholder="请输入应用ID筛选"
                      value={searchAppId}
                      onChange={e => setSearchAppId(e.target.value)}
                      style={{ width: 288 }}
                      allowClear
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">应用名称</label>
                    <Input
                      placeholder="请输入应用名称筛选"
                      value={searchAppName}
                      onChange={e => setSearchAppName(e.target.value)}
                      style={{ width: 288 }}
                      allowClear
                    />
                  </div>
                  <div className="search-form-item">
                    <label className="search-label">创建时间</label>
                    <DatePicker.RangePicker
                      placeholder={['开始日期', '结束日期']}
                      value={searchTimeRange}
                      onChange={(dates) => setSearchTimeRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
                      style={{ width: 288 }}
                      format="YYYY-MM-DD"
                    />
                  </div>
                </div>
                <div className="search-form-row" style={{ justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                  <Button type="primary" onClick={handleSearch}>搜索</Button>
                  <Button onClick={handleReset} style={{ marginLeft: 2 }}>重置</Button>
                </div>
              </div>
            </div>
            <Table<AppGroupRecord>
              rowKey="app_id"
              columns={groupColumns}
              dataSource={pagedGroups}
              loading={tableLoading}
              expandable={{
                expandedRowRender: (record) => (
                  <Table<AppProductRecord>
                    rowKey="id"
                    columns={tierColumns}
                    dataSource={record.tiers}
                    pagination={false}
                    size="small"
                    scroll={{ x: 900 }}
                  />
                )
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: groupList.length,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => setPagination({ current: page, pageSize: pageSize ?? 10 })
              }}
              scroll={{ x: 1000 }}
            />
          </div>
        </Content>
      </Layout>

      <Modal
        title={editingRecord ? '编辑档位' : '新增档位'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="app_id"
            label="应用ID"
            rules={editingRecord ? [] : [{ required: true, message: '请输入应用ID' }]}
          >
            <Input placeholder="如 com.example.game" disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="app_name" label="应用名称">
            <Input placeholder="如 游戏名" />
          </Form.Item>
          <Form.Item
            name="product_id"
            label="商品ID"
            rules={editingRecord ? [] : [{ required: true, message: '请输入商品ID' }]}
          >
            <Input placeholder="如 prodios_1" disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="name" label="档位名称">
            <Input placeholder="如 6元档位" />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <Input placeholder="如 6" />
          </Form.Item>
          <Form.Item name="quantity" label="数量" initialValue={0}>
            <Input type="number" min={0} placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default GameTierManage
