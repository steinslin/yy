# Express + MySQL 登录功能（全栈）

这是一个使用 Express、TypeScript、MySQL 和 React 实现的全栈登录功能示例项目。

## 功能特性

### 后端
- ✅ 用户登录
- ✅ 用户注册
- ✅ JWT Token 认证
- ✅ 密码加密（bcrypt）
- ✅ 获取当前用户信息

### 前端
- ✅ React + TypeScript + Vite
- ✅ 现代化的 UI 设计
- ✅ 登录/注册页面
- ✅ 用户信息展示
- ✅ Token 自动管理
- ✅ 路由保护

## 安装依赖

```bash
npm install
```

## 数据库配置

1. 确保 MySQL 服务已启动
2. 执行数据库初始化脚本：

```bash
mysql -u root -p < src/database/init.sql
```

或者手动在 MySQL 中执行 `src/database/init.sql` 文件中的 SQL 语句。

3. 配置数据库连接（可选，使用环境变量或修改 `src/config/database.ts`）：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=login_db
JWT_SECRET=your-secret-key
```

## 运行项目

### 启动后端服务器

```bash
npm run dev
```

后端服务器将在 `http://localhost:3000` 启动。

### 启动前端开发服务器

在另一个终端窗口中运行：

```bash
npm run dev:frontend
```

前端应用将在 `http://localhost:5173` 启动。

### 构建前端生产版本

```bash
npm run build:frontend
```

构建文件将输出到 `dist` 目录。

## API 接口

### 1. 用户登录

**POST** `/api/auth/login`

请求体：
```json
{
  "username": "admin",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com"
    }
  }
}
```

### 2. 用户注册

**POST** `/api/auth/register`

请求体：
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "newuser@example.com"
}
```

响应：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "username": "newuser",
      "email": "newuser@example.com"
    }
  }
}
```

### 3. 获取当前用户信息

**GET** `/api/auth/me`

请求头：
```
Authorization: Bearer <token>
```

或

```
x-access-token: <token>
```

响应：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 测试用户

执行初始化 SQL 后，可以使用以下测试账号：

- 用户名：`admin`
- 密码：`password123`（需要在数据库中手动创建或使用注册接口）

**注意**：SQL 文件中的测试用户密码哈希值需要替换为实际的 bcrypt 哈希值。建议使用注册接口创建用户。

## 项目结构

```
src/
├── backend/                # 后端代码
│   ├── config/
│   │   └── database.ts     # 数据库连接配置
│   ├── database/
│   │   ├── init.sql        # 数据库初始化脚本
│   │   └── inventory.sql   # 库存表脚本
│   ├── routes/
│   │   └── auth.ts         # 认证路由
│   ├── utils/
│   │   └── generatePassword.ts # 密码生成工具
│   └── index.ts            # 后端应用入口
└── frontend/               # 前端代码
    ├── components/         # React 组件
    │   └── ProtectedRoute.tsx
    ├── contexts/           # React Context
    │   └── AuthContext.tsx
    ├── pages/              # 页面组件
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   └── Dashboard.tsx
    ├── services/           # API 服务
    │   └── api.ts
    ├── App.tsx             # 主应用组件
    ├── main.tsx            # 前端入口
    └── index.css           # 全局样式
```

## 前端功能说明

### 页面路由

- `/login` - 登录页面
- `/register` - 注册页面
- `/dashboard` - 用户信息页面（需要登录）

### 特性

- **自动 Token 管理**：登录后 token 自动保存到 localStorage
- **路由保护**：未登录用户访问受保护页面会自动跳转到登录页
- **Token 验证**：页面加载时自动验证 token 有效性
- **响应式设计**：适配不同屏幕尺寸

## 开发工具

### 代码格式化

```bash
# 格式化代码
npm run format

# 检查代码格式
npm run format:check
```

### 代码检查

```bash
# 检查代码风格
npm run lint

# 自动修复代码风格问题
npm run lint:fix
```

## 安全提示

1. 生产环境中，请将 `JWT_SECRET` 设置为强随机字符串
2. 使用环境变量管理敏感配置
3. 考虑添加请求频率限制
4. 使用 HTTPS
5. 定期更新依赖包
6. 前端 token 存储在 localStorage，生产环境可考虑使用 httpOnly cookie
