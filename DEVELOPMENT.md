# 开发文档 (Development Documentation)

本文档记录了项目的开发上下文、架构设计、已实现功能以及重要实现细节，方便在不同电脑上继续开发时快速了解项目状态。

## 📋 项目概述

这是一个全栈库存管理系统，使用 Express + TypeScript + MySQL 作为后端，React + TypeScript + Vite + Ant Design 作为前端。

### 主要功能模块

1. **用户认证系统**
   - 用户登录/注册
   - JWT Token 认证
   - 路由保护

2. **库存管理系统**
   - 凭证数据查询（支持多条件搜索、分页）
   - 凭证详情查看
   - Excel 批量导入
   - Excel 批量导出（支持选中项或全部导出）
   - 表格行选择（跨页保持选中状态）

## 🛠 技术栈

### 后端
- **框架**: Express 5.2.1
- **语言**: TypeScript 5.9.3
- **数据库**: MySQL (mysql2 3.16.0)
- **认证**: JWT (jsonwebtoken 9.0.3)
- **文件处理**: 
  - multer 2.0.2 (文件上传)
  - xlsx 0.18.5 (Excel 解析)
- **开发工具**: ts-node-dev (热重载)

### 前端
- **框架**: React 19.2.3
- **构建工具**: Vite 5.4.0
- **UI 库**: Ant Design 6.2.0
- **路由**: React Router 6.28.0
- **HTTP 客户端**: Axios 1.13.2
- **日期处理**: dayjs 1.11.19

### 开发工具
- **代码检查**: ESLint
- **代码格式化**: Prettier
- **类型检查**: TypeScript

## 📁 项目结构

```
yy/
├── src/
│   ├── backend/                    # 后端代码
│   │   ├── config/                 # 配置文件
│   │   │   ├── database.ts         # 数据库连接配置
│   │   │   └── excelMapping.ts     # Excel 字段映射配置 ⭐
│   │   ├── database/               # 数据库脚本
│   │   │   ├── init.sql            # 数据库初始化（用户表+库存表）
│   │   │   ├── insert_test_data.sql # 测试数据
│   │   │   ├── inventory.sql       # 库存表结构
│   │   │   └── update_password.sql # 密码更新脚本
│   │   ├── routes/                 # 路由
│   │   │   ├── auth.ts             # 认证路由（登录/注册/获取用户信息）
│   │   │   └── inventory.ts        # 库存路由（查询/导入）
│   │   ├── utils/                  # 工具函数
│   │   │   └── generatePassword.ts # 密码生成工具
│   │   └── index.ts                # 后端入口文件
│   └── frontend/                   # 前端代码
│       ├── components/             # 公共组件
│       │   └── ProtectedRoute.tsx  # 路由保护组件
│       ├── contexts/               # React Context
│       │   └── AuthContext.tsx     # 认证上下文
│       ├── pages/                  # 页面组件
│       │   ├── Home.tsx            # 首页（库存管理主页面）⭐
│       │   ├── Login.tsx           # 登录页
│       │   ├── Register.tsx        # 注册页
│       │   └── Dashboard.tsx       # 仪表盘
│       ├── services/               # API 服务
│       │   └── api.ts              # Axios 配置和拦截器
│       ├── App.tsx                 # 主应用组件
│       └── main.tsx                # 前端入口
├── package.json                    # 项目依赖和脚本
├── tsconfig.json                   # TypeScript 配置
├── vite.config.ts                  # Vite 配置
└── .gitignore                      # Git 忽略文件

⭐ 标记的文件是核心功能实现文件
```

## 🎯 已实现功能详情

### 1. 用户认证系统

#### 后端 (`src/backend/routes/auth.ts`)
- **POST `/api/auth/login`**: 用户登录
  - 支持明文密码验证（已移除 bcrypt 加密）
  - 返回 JWT Token 和用户信息
  - Token 同时支持 `Authorization: Bearer <token>` 和 `x-access-token: <token>` 两种方式

- **POST `/api/auth/register`**: 用户注册
  - 密码明文存储（根据需求调整）

- **GET `/api/auth/me`**: 获取当前用户信息
  - 需要 Token 认证
  - 使用 `verifyToken` 中间件验证

#### 前端 (`src/frontend/contexts/AuthContext.tsx`)
- 全局认证状态管理
- Token 自动保存到 localStorage
- 页面加载时自动验证 Token
- 登录/登出功能

### 2. 库存管理系统

#### 后端 (`src/backend/routes/inventory.ts`)

**GET `/api/inventory`**: 获取库存列表
- 支持分页（默认每页 10 条）
- 支持多条件搜索：
  - `game_name`: 游戏名称（模糊匹配）
  - `app_id`: 应用ID（模糊匹配）
  - `tier_name`: 档位名称（模糊匹配）
  - `status`: 状态（精确匹配，0-4）
  - `in_account`: 入库账户（模糊匹配）
  - `inventory_no`: 库存单号（模糊匹配）
  - `out_device`: 出库设备（模糊匹配）
  - `in_time_start` / `in_time_end`: 入库时间范围（日期范围）
- 查询参数使用 `snake_case` 格式（如 `game_name`）
- 使用直接拼接 `LIMIT` 和 `OFFSET` 的方式避免参数问题

**POST `/api/inventory/import`**: Excel 批量导入
- 支持 `.xlsx` 和 `.xls` 格式
- 文件大小限制：10MB
- 使用 `multer` 处理文件上传（内存存储）
- 使用 `xlsx` 库解析 Excel
- 根据 `excelMapping.ts` 配置进行字段映射
- 数据验证：
  - 检查必填字段
  - 数据类型转换（价格、状态、日期）
  - 重复库存单号检测（使用 `INSERT IGNORE`）
- 返回导入统计（成功/失败数量）

#### 前端 (`src/frontend/pages/Home.tsx`)

**搜索功能**
- 多条件搜索表单
- 日期范围选择器（`RangePicker`）
- 状态下拉选择（带标签显示）
- 搜索和重置按钮

**表格功能**
- Ant Design Table 组件
- 分页功能（可调整每页条数）
- 行选择功能（跨页保持选中状态）
  - 使用 `Map<number, any>` 存储选中的行
  - `preserveSelectedRowKeys: true` 保持跨页选择
- 状态列使用 `Tag` 组件显示（不同颜色）
- 操作列：查看详情按钮
- 详情弹窗：使用 `Modal` + `Descriptions` 显示完整信息

**批量操作**
- **批量导入**：
  - 文件选择对话框
  - 文件类型和大小验证
  - 上传进度提示
  - 导入结果提示（成功/失败统计）
  - 导入后自动刷新表格
- **批量导出**：
  - 如果选中行：导出选中的行
  - 如果未选中：导出全部数据（使用当前搜索条件）
  - CSV 格式导出（带 BOM 支持中文）
  - 包含所有字段，状态转换为文本

## ⚙️ 配置文件说明

### 1. Excel 字段映射配置 (`src/backend/config/excelMapping.ts`)

**用途**: 定义用户上传的 Excel 文件列名到数据库字段的映射关系

**配置结构**:
```typescript
interface ExcelColumnMapping {
  excelColumn: string    // Excel 列名（用户上传文件中的列名）
  dbField: string        // 数据库字段名
  required?: boolean      // 是否必填
  transform?: (value: any) => any  // 数据类型转换函数
  defaultValue?: any      // 默认值
}
```

**重要映射**:
- **必填字段**: 游戏名称、游戏编码、档位名称、档位价格、档位编码、库存单号
- **状态转换**: 支持文本（待入库/已入库等）和数字（0-4）两种格式
- **日期转换**: 自动转换为 MySQL TIMESTAMP 格式
- **价格转换**: 确保为数字类型

**修改映射**: 如需修改 Excel 列名或添加新字段，编辑此文件即可。

### 2. 数据库配置 (`src/backend/config/database.ts`)

- 数据库连接池配置
- 默认连接参数：
  - Host: `localhost`
  - User: `root`
  - Database: `login_db`
  - Password: 空（可通过环境变量配置）

### 3. API 配置 (`src/frontend/services/api.ts`)

- Axios 基础配置
- 请求拦截器：自动添加 Token（同时支持两种 header 格式）
- 响应拦截器：处理 401 错误（自动跳转登录）

## 🔑 重要实现细节

### 1. 认证机制

**Token 传递方式**:
- 前端同时发送两种 header：
  - `Authorization: Bearer <token>`
  - `x-access-token: <token>`
- 后端优先检查 `Authorization`，其次检查 `x-access-token`

**路由保护**:
- `ProtectedRoute` 组件检查 Token 和用户信息
- 未登录自动跳转到 `/login`

### 2. 表格行选择跨页保持

**实现方式**:
```typescript
// 使用 Map 存储选中的行（key: id, value: row data）
const [selectedRows, setSelectedRows] = useState<Map<number, any>>(new Map())

// 选择变化时更新 Map
const handleRowSelectionChange = (selectedRowKeys: React.Key[], selectedRows: any[]) => {
  const newMap = new Map(selectedRows)
  // 合并当前页选中的行
  selectedRows.forEach(row => {
    newMap.set(row.id, row)
  })
  // 保留其他页已选中的行
  selectedRows.forEach((id: number) => {
    if (!selectedRows.some((r: any) => r.id === id)) {
      const existingRow = selectedRows.get(id)
      if (existingRow) newMap.set(id, existingRow)
    }
  })
  setSelectedRows(newMap)
}
```

### 3. Excel 导入数据验证流程

1. **文件验证**: 类型、大小
2. **表头验证**: 检查必填字段是否存在
3. **数据提取**: 根据映射配置提取每行数据
4. **数据转换**: 应用 `transform` 函数（价格、状态、日期）
5. **必填验证**: 检查每行必填字段
6. **数据库插入**: 逐条插入，捕获错误并统计

### 4. 批量导出逻辑

```typescript
if (selectedRows.size === 0) {
  // 导出全部：使用当前搜索条件，pageSize=10000 获取所有数据
  const params = { ...searchForm, page: 1, pageSize: 10000 }
  const response = await api.get('/inventory', { params })
  dataToExport = response.data.data.list
} else {
  // 导出选中项
  dataToExport = Array.from(selectedRows.values())
}
```

### 5. SQL 查询优化

**分页查询问题解决**:
- `mysql2` 对 `LIMIT ? OFFSET ?` 参数化查询有兼容性问题
- 解决方案：直接拼接 `LIMIT` 和 `OFFSET` 值（已确保安全）
```typescript
const safeLimit = Math.max(1, Math.floor(Number(limit)) || 10)
const safeOffset = Math.max(0, Math.floor(Number(offset)) || 0)
const dataQuery = `SELECT * FROM inventory ${whereClause} ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`
```

## 🚀 开发流程

### 启动项目

1. **安装依赖**:
```bash
npm install
```

2. **初始化数据库**:
```bash
mysql -u root -p < src/backend/database/init.sql
```

3. **启动后端** (端口 3000):
```bash
npm run dev
```

4. **启动前端** (端口 5173，新终端):
```bash
npm run dev:frontend
```

### 代码规范

**格式化代码**:
```bash
npm run format
```

**检查代码风格**:
```bash
npm run lint
npm run lint:fix  # 自动修复
```

### 测试账号

- 用户名: `admin`
- 密码: `password123`

## 🐛 常见问题

### 1. 数据库连接失败
- 检查 MySQL 服务是否启动
- 检查 `src/backend/config/database.ts` 中的连接配置
- 确认数据库 `login_db` 已创建

### 2. Token 认证失败
- 检查 Token 是否过期
- 确认请求头格式正确（两种格式都支持）
- 查看后端控制台日志

### 3. Excel 导入失败
- 检查文件格式（必须是 .xlsx 或 .xls）
- 确认表头包含所有必填字段
- 查看后端返回的错误信息
- 检查 `excelMapping.ts` 中的列名配置是否匹配

### 4. 分页查询错误
- 已通过直接拼接 LIMIT/OFFSET 解决
- 如果仍有问题，检查参数类型转换

### 5. 中文乱码
- Excel 导入：确保文件使用 UTF-8 编码
- CSV 导出：已添加 BOM (`\uFEFF`) 支持中文
- 数据库：使用 `utf8mb4` 字符集

## 📝 待实现功能（可选）

- [ ] 批量删除功能
- [ ] 数据编辑功能
- [ ] 导入模板下载
- [ ] 导入历史记录
- [ ] 数据统计图表
- [ ] 权限管理（不同角色）

## 🔄 版本历史

### 当前版本功能
- ✅ 用户认证系统（登录/注册）
- ✅ 库存数据查询（多条件搜索、分页）
- ✅ 凭证详情查看
- ✅ Excel 批量导入（带字段映射配置）
- ✅ Excel 批量导出（支持选中/全部）
- ✅ 表格行选择（跨页保持）
- ✅ 状态标签显示
- ✅ 日期范围搜索

---

**最后更新**: 2024年（根据实际日期更新）

**维护者**: 开发团队

**注意事项**: 
- 密码目前使用明文存储（根据需求可调整）
- 生产环境请配置环境变量管理敏感信息
- 建议添加请求频率限制和更完善的错误处理
