import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Input,
  Button,
  message,
  Modal,
  Drawer,
  Form,
  Select,
  Spin,
  Progress,
  type MenuProps
} from 'antd'
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
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
  ApartmentOutlined,
  EyeOutlined,
  VideoCameraOutlined,
  DisconnectOutlined
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import './DeviceManage.css'

const { Header, Sider, Content } = Layout

type DeviceStatusType = 'online' | 'maintenance' | 'offline'
type LoginStatusType = 'logged_in' | 'not_logged_in'
type WorkStatusType = 'abnormal' | 'idle' | 'task'

interface DeviceCardRecord {
  id: number
  status: DeviceStatusType
  loginStatus: LoginStatusType
  device_name: string
  uuid: string
  systemVersion: string
  ip: string
  workStatus: WorkStatusType
  workStatusText?: string
  estimatedTime?: string
}

/** 详情弹窗所需的扩展运行参数（可从后端拉取，此处用 mock） */
interface DeviceRuntimeDetail {
  importTime: string
  runningTime: string
  /** 存储空间，格式：已用GB / 总容量GB，如 "128GB / 256GB" */
  storage: string
  temperature: string
  installedGames: string[]
  batteryPercent: number
}

type GroupType = 'auto' | 'manual'

interface DeviceGroupRecord {
  id: number
  name: string
  groupType: GroupType
  devices: DeviceCardRecord[]
}

const STATUS_MAP: Record<DeviceStatusType, { text: string; color: string }> = {
  online: { text: '在线', color: 'green' },
  maintenance: { text: '维护中', color: 'orange' },
  offline: { text: '离线', color: 'default' }
}

const LOGIN_MAP: Record<LoginStatusType, string> = {
  logged_in: '已登录',
  not_logged_in: '未登录'
}

const WORK_STATUS_MAP: Record<WorkStatusType, string> = {
  abnormal: '异常状态',
  idle: '空闲状态',
  task: '执行任务'
}

/** 根据设备生成详情运行参数（mock，实际可来自接口） */
function getDeviceRuntimeDetail(device: DeviceCardRecord): DeviceRuntimeDetail {
  const seed = device.id
  const totalGB = 256
  const usedGB = [64, 128, 192, 256][seed % 4]
  return {
    importTime: `2024-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')} 10:00`,
    runningTime: `${seed % 7}天${seed % 24}小时`,
    storage: `${usedGB}GB / ${totalGB}GB`,
    temperature: `${(seed % 10) + 32}°C`,
    installedGames: ['王者荣耀', '和平精英', '原神', '崩坏：星穹铁道', '金铲铲之战'].slice(0, (seed % 5) + 1),
    batteryPercent: (seed % 40) + 55
  }
}

const DeviceManage = () => {
  const { logout, loading } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [advancedFilterVisible, setAdvancedFilterVisible] = useState(false)
  const [groupData, setGroupData] = useState<DeviceGroupRecord[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [advancedForm] = Form.useForm()
  const [addDeviceForm] = Form.useForm()

  const [addDeviceVisible, setAddDeviceVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailDevice, setDetailDevice] = useState<DeviceCardRecord | null>(null)
  const systemVersionValue = Form.useWatch('systemVersion', addDeviceForm)

  const [advancedFilters, setAdvancedFilters] = useState<{
    deviceType?: string
    status?: number
    groupName?: string
  }>({})

  const fetchDeviceList = async () => {
    setListLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 400))
      const createDevice = (
        baseId: number,
        name: string,
        ipLast: number,
        status: DeviceStatusType,
        loginStatus: LoginStatusType,
        workStatus: WorkStatusType,
        workText?: string,
        estimated?: string
      ): DeviceCardRecord => ({
        id: baseId,
        status,
        loginStatus,
        device_name: name,
        uuid: `${name.replace(/[^a-z0-9]/gi, '')}-${baseId}-UUID`,
        systemVersion: workStatus === 'task' ? 'iOS 17.1' : 'iOS 17.0',
        ip: `192.168.1.${ipLast}`,
        workStatus,
        workStatusText: workText,
        estimatedTime: estimated
      })
      const mockGroups: DeviceGroupRecord[] = [
        {
          id: 1,
          name: '第一组',
          groupType: 'auto',
          devices: [
            createDevice(101, 'IPhone_001', 101, 'online', 'logged_in', 'idle'),
            createDevice(102, 'IPhone_002', 102, 'maintenance', 'not_logged_in', 'task', '自动化测试', '剩余 12 分钟'),
            createDevice(103, 'IPhone_003', 103, 'offline', 'not_logged_in', 'abnormal'),
            createDevice(104, 'IPhone_004', 104, 'online', 'logged_in', 'idle'),
            createDevice(105, 'IPhone_005', 105, 'online', 'not_logged_in', 'task', '兼容性测试', '剩余 8 分钟'),
            createDevice(106, 'IPad_001', 106, 'online', 'logged_in', 'idle'),
            createDevice(107, 'IPhone_006', 107, 'maintenance', 'not_logged_in', 'idle'),
            createDevice(108, 'IPhone_007', 108, 'offline', 'not_logged_in', 'abnormal'),
            createDevice(109, 'IPhone_008', 109, 'online', 'logged_in', 'task', '自动化测试', '剩余 20 分钟'),
            createDevice(110, 'IPad_002', 110, 'online', 'not_logged_in', 'idle')
          ]
        },
        {
          id: 2,
          name: '第二组',
          groupType: 'manual',
          devices: [
            createDevice(201, 'IPhone_009', 111, 'online', 'logged_in', 'idle'),
            createDevice(202, 'IPad_003', 112, 'online', 'not_logged_in', 'task', '自动化测试', '剩余 5 分钟'),
            createDevice(203, 'IPhone_010', 113, 'offline', 'not_logged_in', 'abnormal'),
            createDevice(204, 'IPhone_011', 114, 'online', 'logged_in', 'idle'),
            createDevice(205, 'IPhone_012', 115, 'maintenance', 'not_logged_in', 'idle'),
            createDevice(206, 'IPad_004', 116, 'online', 'logged_in', 'task', '压力测试', '剩余 15 分钟'),
            createDevice(207, 'IPhone_013', 117, 'online', 'not_logged_in', 'idle'),
            createDevice(208, 'IPhone_014', 118, 'online', 'logged_in', 'idle'),
            createDevice(209, 'IPhone_015', 119, 'offline', 'not_logged_in', 'abnormal'),
            createDevice(210, 'IPad_005', 120, 'online', 'logged_in', 'idle')
          ]
        },
        {
          id: 3,
          name: '第三组',
          groupType: 'auto',
          devices: [
            createDevice(301, 'IPhone_016', 121, 'online', 'logged_in', 'idle'),
            createDevice(302, 'IPhone_017', 122, 'online', 'not_logged_in', 'task', '自动化测试', '剩余 3 分钟'),
            createDevice(303, 'IPad_006', 123, 'maintenance', 'not_logged_in', 'idle'),
            createDevice(304, 'IPhone_018', 124, 'offline', 'not_logged_in', 'abnormal'),
            createDevice(305, 'IPhone_019', 125, 'online', 'logged_in', 'idle'),
            createDevice(306, 'IPhone_020', 126, 'online', 'logged_in', 'idle'),
            createDevice(307, 'IPad_007', 127, 'online', 'not_logged_in', 'task', '回归测试', '剩余 10 分钟'),
            createDevice(308, 'IPhone_021', 128, 'maintenance', 'not_logged_in', 'idle'),
            createDevice(309, 'IPhone_022', 129, 'online', 'logged_in', 'idle'),
            createDevice(310, 'IPad_008', 130, 'online', 'not_logged_in', 'idle')
          ]
        }
      ]
      setGroupData(mockGroups)
    } catch (e) {
      message.error('获取设备列表失败')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    fetchDeviceList()
  }, [])

  const handleSearch = () => fetchDeviceList()
  const handleRefresh = () => {
    setSearchKeyword('')
    advancedForm.resetFields()
    setAdvancedFilters({})
    fetchDeviceList()
    message.success('已刷新列表')
  }
  const handleAdvancedFilterOpen = () => setAdvancedFilterVisible(true)
  const handleAdvancedFilterApply = () => {
    advancedForm.validateFields().then(values => {
      setAdvancedFilters({
        deviceType: values.deviceType,
        status: values.status,
        groupName: values.groupName
      })
      setAdvancedFilterVisible(false)
      fetchDeviceList()
      message.success('已应用筛选条件')
    })
  }
  const handleAdvancedFilterReset = () => {
    advancedForm.resetFields()
    setAdvancedFilters({})
    message.info('已清空筛选条件')
  }

  const handleAddDevice = () => setAddDeviceVisible(true)
  const handleAddDeviceCancel = () => {
    setAddDeviceVisible(false)
    addDeviceForm.resetFields()
  }
  const handleAddDeviceSave = () => {
    addDeviceForm.validateFields().then(values => {
      console.log('新增设备:', values)
      message.success('保存成功')
      setAddDeviceVisible(false)
      addDeviceForm.resetFields()
      fetchDeviceList()
    }).catch(() => {})
  }

  const handleDeviceGroup = () => message.info('设备分组功能待对接后端')
  const handleViewDetail = (device: DeviceCardRecord) => {
    setDetailDevice(device)
    setDetailVisible(true)
  }
  const handleDetailClose = () => {
    setDetailVisible(false)
    setDetailDevice(null)
  }
  const handleViewScreen = (device: DeviceCardRecord) => message.info(`查看画面：${device.device_name}`)
  const handleOffline = (device: DeviceCardRecord) => message.info(`下线：${device.device_name}`)
  const handleRefreshDevice = (device: DeviceCardRecord) => message.info(`刷新：${device.device_name}`)

  const menuItems: MenuProps['items'] = [
    { key: '1', icon: <FileTextOutlined />, label: '凭证管理', onClick: () => navigate('/home') },
    { key: '2', icon: <AppleOutlined />, label: 'AppleID管理' },
    { key: '3', icon: <MobileOutlined />, label: '设备管理' },
    { key: '3-1', icon: <ApartmentOutlined />, label: '设备分组管理', onClick: () => navigate('/device-groups') },
    { key: '4', icon: <CheckCircleOutlined />, label: '任务管理' },
    { key: '5', icon: <PlayCircleOutlined />, label: '游戏档位管理', onClick: () => navigate('/game-tiers') },
    { key: '6', icon: <FileSearchOutlined />, label: '查看日志' },
    { key: '7', icon: <TeamOutlined />, label: '用户管理' },
    { key: '8', icon: <SettingOutlined />, label: '系统设置' }
  ]

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login') } }
  ]

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>加载中...</div>
  }

  return (
    <Layout className="device-layout">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={200} className="device-sider">
        <div className="logo"><h2>{collapsed ? '云' : '云充值'}</h2></div>
        <Menu theme="dark" mode="inline" selectedKeys={['3']} items={menuItems} className="device-menu" />
      </Sider>
      <Layout>
        <Header className="device-header" style={{ left: collapsed ? 80 : 200 }}>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info"><Avatar icon={<UserOutlined />} /></div>
            </Dropdown>
          </div>
        </Header>
        <Content className="device-content" style={{ marginLeft: collapsed ? 80 : 200 }}>
          <div className="device-content-wrapper">
            <div className="device-search-row">
              <Input
                className="device-search-input"
                placeholder="请输入设备名称、编码等关键词搜索"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
              <div className="device-search-buttons">
                <Button type="default" icon={<FilterOutlined />} onClick={handleAdvancedFilterOpen}>高级筛选</Button>
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh}>刷新列表</Button>
              </div>
            </div>

            <div className="device-toolbar">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDevice}>新增设备</Button>
              <Button icon={<ApartmentOutlined />} onClick={handleDeviceGroup}>设备分组</Button>
            </div>

            <div className="device-results">
              {listLoading ? (
                <div className="device-results-loading"><Spin size="large" tip="加载中..." /></div>
              ) : (
                groupData.map(group => (
                  <div key={group.id} className="device-group">
                    <div className="device-group-title-row">
                      <div className="device-group-title-wrap">
                        <h3 className="device-group-title">{group.name}</h3>
                        <span className="device-group-tag">
                          {group.groupType === 'auto' ? '自动组' : '手动组'}
                        </span>
                      </div>
                      <div className="device-group-summary">
                        <span className="device-group-summary-item device-group-summary-online">
                          在线：{group.devices.filter(d => d.status === 'online').length}/{group.devices.length}
                        </span>
                        <span className="device-group-summary-item device-group-summary-login">
                          已登录：{group.devices.filter(d => d.loginStatus === 'logged_in').length}/{group.devices.length}
                        </span>
                        <span className="device-group-summary-item device-group-summary-task">
                          执行任务：{group.devices.filter(d => d.workStatus === 'task').length}/{group.devices.length}
                        </span>
                      </div>
                    </div>
                    <div className="device-group-scroll">
                      {group.devices.map(device => (
                        <div key={device.id} className="device-card">
                          <div className="device-card-body">
                            <div className="device-card-header">
                              <span className={`device-card-status device-card-status--${device.status}`}>
                                {STATUS_MAP[device.status].text}
                              </span>
                              <span className={`device-card-login device-card-login--${device.loginStatus}`}>
                                {LOGIN_MAP[device.loginStatus]}
                              </span>
                            </div>
                            <div className="device-card-name">{device.device_name}</div>
                            <div className="device-card-row">
                              <span className="device-card-label">UUID</span>
                              <span className="device-card-value device-card-uuid" title={device.uuid}>{device.uuid}</span>
                            </div>
                            <div className="device-card-row">
                              <span className="device-card-label">系统版本</span>
                              <span className="device-card-value">{device.systemVersion}</span>
                            </div>
                            <div className="device-card-row">
                              <span className="device-card-label">IP</span>
                              <span className="device-card-value">{device.ip}</span>
                            </div>
                            <div className="device-card-work">
                              <span className="device-card-label">工作状态</span>
                              <span className="device-card-value">
                                {device.workStatus === 'task' && device.workStatusText
                                  ? `${WORK_STATUS_MAP[device.workStatus]}：${device.workStatusText}`
                                  : WORK_STATUS_MAP[device.workStatus]}
                              </span>
                              {device.estimatedTime && (
                                <span className="device-card-estimated">预计 {device.estimatedTime}</span>
                              )}
                            </div>
                          </div>
                          <div className="device-card-actions">
                            <Button type="primary" block className="device-card-btn-detail" icon={<EyeOutlined />} onClick={() => handleViewDetail(device)}>查看详情</Button>
                            <Button block className="device-card-btn-screen" icon={<VideoCameraOutlined />} onClick={() => handleViewScreen(device)}>查看画面</Button>
                            <Button block danger className="device-card-btn-offline" icon={<DisconnectOutlined />} onClick={() => handleOffline(device)}>下线</Button>
                            <Button block className="device-card-btn-refresh" icon={<ReloadOutlined />} onClick={() => handleRefreshDevice(device)}>刷新</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Content>
      </Layout>

      <Modal
        title="新增设备"
        open={addDeviceVisible}
        onCancel={handleAddDeviceCancel}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleAddDeviceCancel}>取消</Button>
            <Button type="primary" onClick={handleAddDeviceSave}>保存设备</Button>
          </div>
        }
        destroyOnClose
        width={480}
      >
        <Form form={addDeviceForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="deviceName" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
            <Input placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item name="deviceUuid" label="设备UUID" rules={[{ required: true, message: '请输入设备UUID' }]}>
            <Input placeholder="请输入设备UUID" />
          </Form.Item>
          <Form.Item name="systemVersion" label="系统版本">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                placeholder="请输入系统版本，如 iOS 17.1"
                value={systemVersionValue ?? ''}
                onChange={e => addDeviceForm.setFieldValue('systemVersion', e.target.value)}
                style={{ flex: 1 }}
              />
              <Button htmlType="button" className="add-device-auto-get-btn" onClick={() => message.info('自动获取功能待对接设备信息')}>自动获取</Button>
            </div>
          </Form.Item>
          <Form.Item name="deviceGroup" label="设备分组">
            <Select placeholder="请选择设备分组" allowClear>
              {groupData.map(g => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="设备详情"
        open={detailVisible}
        onCancel={handleDetailClose}
        footer={
          <Button type="primary" onClick={handleDetailClose}>关闭</Button>
        }
        destroyOnClose
        width={560}
        className="device-detail-modal"
      >
        {detailDevice && (() => {
          const runtime = getDeviceRuntimeDetail(detailDevice)
          return (
            <div className="device-detail-content">
              <div className="device-detail-header">
                <div className="device-detail-image">
                  <MobileOutlined />
                </div>
                <div className="device-detail-basic">
                  <h3 className="device-detail-name">{detailDevice.device_name}</h3>
                  <span className={`device-detail-status device-detail-status--${detailDevice.status}`}>
                    {STATUS_MAP[detailDevice.status].text}
                  </span>
                </div>
              </div>
              <div className="device-detail-section">
                <div className="device-detail-row">
                  <span className="device-detail-label">设备导入时间</span>
                  <span className="device-detail-value">{runtime.importTime}</span>
                </div>
                <div className="device-detail-row">
                  <span className="device-detail-label">设备运行时间</span>
                  <span className="device-detail-value">{runtime.runningTime}</span>
                </div>
                <div className="device-detail-row">
                  <span className="device-detail-label">设备 UUID</span>
                  <span className="device-detail-value device-detail-uuid" title={detailDevice.uuid}>{detailDevice.uuid}</span>
                </div>
                <div className="device-detail-row">
                  <span className="device-detail-label">系统版本</span>
                  <span className="device-detail-value">{detailDevice.systemVersion}</span>
                </div>
              </div>
              <div className="device-detail-section">
                <div className="device-detail-section-title">当前运行参数</div>
                <div className="device-detail-row">
                  <span className="device-detail-label">存储空间</span>
                  <span className="device-detail-value">{runtime.storage}</span>
                </div>
                <div className="device-detail-row">
                  <span className="device-detail-label">网络 IP</span>
                  <span className="device-detail-value">{detailDevice.ip}</span>
                </div>
                <div className="device-detail-row">
                  <span className="device-detail-label">温度</span>
                  <span className="device-detail-value">{runtime.temperature}</span>
                </div>
                <div className="device-detail-row device-detail-row--games">
                  <span className="device-detail-label">已安装游戏</span>
                  <div className="device-detail-value">
                    {runtime.installedGames.length > 0
                      ? <ul className="device-detail-games">{runtime.installedGames.map((g, i) => <li key={i}>{g}</li>)}</ul>
                      : <span className="device-detail-empty">暂无</span>}
                  </div>
                </div>
                <div className="device-detail-row device-detail-row--battery">
                  <span className="device-detail-label">设备电量</span>
                  <div className="device-detail-value">
                    <Progress
                      percent={runtime.batteryPercent}
                      showInfo
                      strokeColor={runtime.batteryPercent > 20 ? undefined : '#ff4d4f'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Drawer
        title="高级筛选"
        placement="right"
        width={360}
        open={advancedFilterVisible}
        onClose={() => setAdvancedFilterVisible(false)}
        footer={
          <div className="device-drawer-footer">
            <Button onClick={() => setAdvancedFilterVisible(false)}>取消</Button>
            <Button onClick={handleAdvancedFilterReset}>重置</Button>
            <Button type="primary" onClick={handleAdvancedFilterApply}>应用</Button>
          </div>
        }
      >
        <Form form={advancedForm} layout="vertical">
          <Form.Item name="deviceType" label="设备类型">
            <Select placeholder="请选择设备类型" allowClear>
              <Select.Option value="手机">手机</Select.Option>
              <Select.Option value="平板">平板</Select.Option>
              <Select.Option value="电脑">电脑</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear>
              <Select.Option value={1}>正常</Select.Option>
              <Select.Option value={0}>停用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="groupName" label="所属分组">
            <Input placeholder="请输入分组名称" allowClear />
          </Form.Item>
        </Form>
      </Drawer>
    </Layout>
  )
}

export default DeviceManage
