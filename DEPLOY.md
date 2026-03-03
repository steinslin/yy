# 本地 Windows 生产环境部署说明

本项目可在本地 Windows 上以「生产模式」运行：前端打包后由后端统一托管，浏览器只需访问一个端口。

## 一、环境要求

- **Node.js**：建议 18 或 20 LTS（从 [nodejs.org](https://nodejs.org/) 安装）
- **MySQL**：本地已安装并启动，并已创建数据库 `login_db`（或你在 `.env` 里配置的库名）
- **npm**：随 Node 安装

## 二、部署步骤

### 1. 克隆/解压代码并安装依赖

```bash
cd 项目根目录
npm install
```

### 2. 配置环境变量（可选）

复制示例配置并按本机环境修改：

```bash
copy .env.example .env
```

用记事本编辑 `.env`，主要确认：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `NODE_ENV` | 生产模式固定为 `production` | production |
| `DB_HOST` | MySQL 地址 | localhost |
| `DB_USER` | MySQL 用户名 | root |
| `DB_PASSWORD` | MySQL 密码 | 空 |
| `DB_NAME` | 数据库名 | login_db |

不创建 `.env` 时，将使用上述默认值。

### 3. 初始化数据库（首次部署）

在 MySQL 中执行项目中的建表脚本，例如：

```bash
mysql -u root -p < src/backend/database/init.sql
```

或使用 Navicat、MySQL Workbench 等工具执行 `src/backend/database/init.sql`。

### 4. 构建前端并启动服务

**方式 A：一键脚本（推荐）**

双击运行项目根目录下的：

```
start-production.bat
```

脚本会依次：检查依赖 → 构建前端 → 以生产模式启动后端（并托管前端）。

**方式 B：命令行**

```bash
# 构建前端（输出到 dist/）
npm run build

# 生产模式启动（后端托管 dist，单端口）
npm run start
```

### 5. 访问应用

浏览器打开：

- **http://localhost:3000**

前端页面和接口都在同一端口，无需单独开前端开发服务器。

---

## 三、生产模式说明

- **`NODE_ENV=production`** 时，后端会：
  - 提供 `dist/` 中的静态资源（前端打包结果）
  - 对未匹配到 API 的请求返回 `index.html`，供前端路由使用
- 前端请求使用相对路径 `/api`，与后端同源，无需配置 CORS 白名单。
- 关闭运行 `start-production.bat` 的窗口，或在该窗口按 Ctrl+C，即可停止服务。

---

## 四、常见问题

1. **“找不到路径”或启动报错**  
   确保在项目根目录执行上述命令，且已执行过 `npm install`。

2. **数据库连接失败**  
   检查 MySQL 已启动，`.env` 中 `DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` 是否正确，以及是否已执行 `init.sql` 建库建表。

3. **端口被占用**  
   修改 `.env` 中的 `PORT`（如 3001），然后重新执行 `npm run start` 或 `start-production.bat`。

4. **修改代码后**  
   需要重新执行一次 `npm run build`，再执行 `npm run start` 或 `start-production.bat`，才能看到前端/后端变更。
