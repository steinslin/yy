import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Card,
  List,
  Modal,
  Form,
  Input,
  Select,
  message,
  type MenuProps
} from 'antd'
import {
  UserOutlined,
  LogoutOutlined,
  FileTextOutlined,
  AppleOutlined,
  MobileOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
  SettingOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
  SaveOutlined,
  UndoOutlined
} from '@ant-design/icons'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useAuth } from '../contexts/AuthContext'
import './DeviceManage.css'

const { Header, Sider, Content } = Layout

export type GroupType = 'auto' | 'manual'

export interface DeviceInGroup {
  id: number
  device_name: string
  uuid?: string
}

export interface GroupItem {
  id: number
  name: string
  groupType: GroupType
  devices: DeviceInGroup[]
}

const createInitialGroups = (): GroupItem[] => [
  {
    id: 1,
    name: '第一组',
    groupType: 'auto',
    devices: [
      { id: 101, device_name: 'IPhone_001', uuid: 'uuid-101' },
      { id: 102, device_name: 'IPhone_002', uuid: 'uuid-102' },
      { id: 103, device_name: 'IPhone_003', uuid: 'uuid-103' }
    ]
  },
  {
    id: 2,
    name: '第二组',
    groupType: 'manual',
    devices: [
      { id: 201, device_name: 'IPhone_004', uuid: 'uuid-201' },
      { id: 202, device_name: 'IPad_001', uuid: 'uuid-202' }
    ]
  },
  {
    id: 3,
    name: '第三组',
    groupType: 'auto',
    devices: [
      { id: 301, device_name: 'IPhone_005', uuid: 'uuid-301' }
    ]
  }
]

const GROUPS_DROPPABLE_ID = 'groups'

const DeviceGroupManage = () => {
  const { logout, loading } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [groups, setGroups] = useState<GroupItem[]>(() => createInitialGroups())
  const [addGroupVisible, setAddGroupVisible] = useState(false)
  const [addGroupForm] = Form.useForm()

  const getNextGroupId = () => Math.max(0, ...groups.map(g => g.id)) + 1

  const menuItems: MenuProps['items'] = [
    { key: '1', icon: <FileTextOutlined />, label: '凭证管理', onClick: () => navigate('/home') },
    { key: '2', icon: <AppleOutlined />, label: 'AppleID管理' },
    { key: '3', icon: <MobileOutlined />, label: '设备管理', onClick: () => navigate('/devices') },
    { key: '3-1', icon: <ApartmentOutlined />, label: '设备分组管理' },
    { key: '4', icon: <CheckCircleOutlined />, label: '任务管理' },
    { key: '5', icon: <PlayCircleOutlined />, label: '游戏档位管理', onClick: () => navigate('/game-tiers') },
    { key: '6', icon: <FileSearchOutlined />, label: '查看日志' },
    { key: '7', icon: <TeamOutlined />, label: '用户管理' },
    { key: '8', icon: <SettingOutlined />, label: '系统设置' }
  ]

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login') } }
  ]

  const handleAddGroup = () => setAddGroupVisible(true)
  const handleAddGroupCancel = () => {
    setAddGroupVisible(false)
    addGroupForm.resetFields()
  }
  const handleAddGroupOk = () => {
    addGroupForm.validateFields().then(values => {
      const newGroup: GroupItem = {
        id: getNextGroupId(),
        name: values.name,
        groupType: values.groupType,
        devices: []
      }
      setGroups(prev => [...prev, newGroup])
      message.success('已新增分组')
      setAddGroupVisible(false)
      addGroupForm.resetFields()
    }).catch(() => {})
  }

  const moveGroup = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= groups.length) return
    setGroups(prev => {
      const next = [...prev]
      ;[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]
      return next
    })
    message.success('分组顺序已调整')
  }

  const moveDeviceInGroup = (groupIndex: number, deviceIndex: number, direction: 'up' | 'down') => {
    const group = groups[groupIndex]
    const toIndex = direction === 'up' ? deviceIndex - 1 : deviceIndex + 1
    if (toIndex < 0 || toIndex >= group.devices.length) return
    setGroups(prev => {
      const next = prev.map((g, gi) => {
        if (gi !== groupIndex) return g
        const devs = [...g.devices]
        ;[devs[deviceIndex], devs[toIndex]] = [devs[toIndex], devs[deviceIndex]]
        return { ...g, devices: devs }
      })
      return next
    })
    message.success('设备顺序已调整')
  }

  const handleSaveOrder = () => {
    // TODO: 调用后端接口保存分组与设备排序
    message.success('排序已保存')
  }

  const handleReset = () => {
    setGroups(createInitialGroups())
    message.success('已恢复为初始排序状态')
  }

  const moveDeviceToGroup = (fromGroupIndex: number, deviceIndex: number, toGroupId: number) => {
    const toGroupIndex = groups.findIndex(g => g.id === toGroupId)
    if (toGroupIndex < 0 || toGroupIndex === fromGroupIndex) return
    const device = groups[fromGroupIndex].devices[deviceIndex]
    setGroups(prev => {
      const next = prev.map((g, gi) => {
        if (gi === fromGroupIndex) {
          return { ...g, devices: g.devices.filter((_, i) => i !== deviceIndex) }
        }
        if (g.id === toGroupId) {
          return { ...g, devices: [...g.devices, device] }
        }
        return g
      })
      return next
    })
    message.success(`已将 ${device.device_name} 移至 ${groups[toGroupIndex].name}`)
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return

    if (source.droppableId === GROUPS_DROPPABLE_ID) {
      if (destination.droppableId !== GROUPS_DROPPABLE_ID) return
      if (source.index === destination.index) return
      setGroups(prev => {
        const next = [...prev]
        const [removed] = next.splice(source.index, 1)
        next.splice(destination.index, 0, removed)
        return next
      })
      message.success('分组顺序已调整')
      return
    }

    const sourceGroupId = source.droppableId.startsWith('group-') ? Number(source.droppableId.replace('group-', '')) : null
    const destGroupId = destination.droppableId.startsWith('group-') ? Number(destination.droppableId.replace('group-', '')) : null
    if (sourceGroupId == null || destGroupId == null) return

    const fromGroupIndex = groups.findIndex(g => g.id === sourceGroupId)
    const toGroupIndex = groups.findIndex(g => g.id === destGroupId)
    if (fromGroupIndex < 0 || toGroupIndex < 0) return

    const device = groups[fromGroupIndex].devices[source.index]
    if (!device) return

    setGroups(prev => {
      if (fromGroupIndex === toGroupIndex) {
        const group = prev[fromGroupIndex]
        const devs = [...group.devices]
        devs.splice(source.index, 1)
        devs.splice(destination.index, 0, device)
        return prev.map((g, gi) =>
          gi === fromGroupIndex ? { ...g, devices: devs } : g
        )
      }
      const next = prev.map((g, gi) => {
        if (gi === fromGroupIndex) {
          return { ...g, devices: g.devices.filter((_, i) => i !== source.index) }
        }
        if (gi === toGroupIndex) {
          const devs = [...g.devices]
          devs.splice(destination.index, 0, device)
          return { ...g, devices: devs }
        }
        return g
      })
      return next
    })
    if (fromGroupIndex === toGroupIndex) {
      message.success('设备顺序已调整')
    } else {
      message.success(`已将 ${device.device_name} 移至 ${groups[toGroupIndex].name}`)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>加载中...</div>
  }

  return (
    <Layout className="device-layout">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={200} className="device-sider">
        <div className="logo"><h2>{collapsed ? '云' : '云充值'}</h2></div>
        <Menu theme="dark" mode="inline" selectedKeys={['3-1']} items={menuItems} className="device-menu" />
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
            <div className="device-toolbar" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGroup}>新增分组</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button icon={<UndoOutlined />} onClick={handleReset}>重置</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveOrder}>保存排序</Button>
              </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={GROUPS_DROPPABLE_ID} type="GROUP">
                {provided => (
                  <div className="device-group-manage-list" ref={provided.innerRef} {...provided.droppableProps}>
                    {groups.map((group, groupIndex) => (
                      <Draggable key={group.id} draggableId={`group-${group.id}`} index={groupIndex}>
                        {(providedGroup, snapshotGroup) => (
                          <div
                            ref={providedGroup.innerRef}
                            {...providedGroup.draggableProps}
                            className={snapshotGroup.isDragging ? 'device-group-manage-card-wrapper device-group-manage-card-dragging' : 'device-group-manage-card-wrapper'}
                          >
                            <Card
                              className="device-group-manage-card"
                              title={
                                <div className="device-group-manage-card-title" {...providedGroup.dragHandleProps} style={{ cursor: 'grab' }}>
                                  <HolderOutlined style={{ marginRight: 8, color: '#999' }} />
                                  <span>{group.name}</span>
                                  <span className="device-group-tag" style={{ marginLeft: 8 }}>
                                    {group.groupType === 'auto' ? '自动组' : '手动组'}
                                  </span>
                                  <span style={{ marginLeft: 12, fontSize: 13, color: '#666' }}>
                                    共 {group.devices.length} 台设备
                                  </span>
                                </div>
                              }
                              extra={
                                <div className="device-group-manage-card-actions">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<ArrowUpOutlined />}
                                    disabled={groupIndex === 0}
                                    onClick={() => moveGroup(groupIndex, 'up')}
                                  >
                                    上移
                                  </Button>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<ArrowDownOutlined />}
                                    disabled={groupIndex === groups.length - 1}
                                    onClick={() => moveGroup(groupIndex, 'down')}
                                  >
                                    下移
                                  </Button>
                                </div>
                              }
                            >
                              <Droppable droppableId={`group-${group.id}`}>
                                {providedDev => (
                                  <div
                                    ref={providedDev.innerRef}
                                    {...providedDev.droppableProps}
                                    className="device-group-droppable"
                                    style={{ minHeight: group.devices.length ? 0 : 48 }}
                                  >
                                    {group.devices.length === 0 ? (
                                      <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>
                                        暂无设备，可拖拽其他分组的设备到此处
                                      </div>
                                    ) : (
                                      group.devices.map((device, deviceIndex) => (
                                        <Draggable
                                          key={`${group.id}-${device.id}`}
                                          draggableId={`device-${group.id}-${device.id}`}
                                          index={deviceIndex}
                                        >
                                          {(providedDevItem, snapshot) => (
                                            <div
                                              ref={providedDevItem.innerRef}
                                              {...providedDevItem.draggableProps}
                                              {...providedDevItem.dragHandleProps}
                                              className={`device-group-manage-device-item device-group-manage-device-item-draggable${snapshot.isDragging ? ' device-group-manage-device-item-dragging' : ''}`}
                                            >
                                              <div className="device-group-manage-device-item-content">
                                                <HolderOutlined style={{ marginRight: 8, color: '#999', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  <div style={{ fontWeight: 500 }}>{device.device_name}</div>
                                                  {device.uuid && <div style={{ fontSize: 12, color: '#999' }}>UUID: {device.uuid}</div>}
                                                </div>
                                                <Select
                                                  size="small"
                                                  placeholder="移动到"
                                                  style={{ width: 120 }}
                                                  options={groups
                                                    .filter(g => g.id !== group.id)
                                                    .map(g => ({ label: g.name, value: g.id }))}
                                                  onSelect={(toGroupId: number) => moveDeviceToGroup(groupIndex, deviceIndex, toGroupId)}
                                                  onClick={e => e.stopPropagation()}
                                                />
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  icon={<ArrowUpOutlined />}
                                                  disabled={deviceIndex === 0}
                                                  onClick={() => moveDeviceInGroup(groupIndex, deviceIndex, 'up')}
                                                />
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  icon={<ArrowDownOutlined />}
                                                  disabled={deviceIndex === group.devices.length - 1}
                                                  onClick={() => moveDeviceInGroup(groupIndex, deviceIndex, 'down')}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))
                                    )}
                                    {providedDev.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </Content>
      </Layout>

      <Modal
        title="新增分组"
        open={addGroupVisible}
        onCancel={handleAddGroupCancel}
        onOk={handleAddGroupOk}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={addGroupForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="name" label="分组名称" rules={[{ required: true, message: '请输入分组名称' }]}>
            <Input placeholder="如：第四组" />
          </Form.Item>
          <Form.Item name="groupType" label="类型" initialValue="manual" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="auto">自动组</Select.Option>
              <Select.Option value="manual">手动组</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default DeviceGroupManage
