@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] 检查依赖...
if not exist "node_modules" (
  echo 正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败
    pause
    exit /b 1
  )
)

echo [2/3] 构建前端...
call npm run build
if errorlevel 1 (
  echo 前端构建失败
  pause
  exit /b 1
)

echo [3/3] 启动生产服务...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 可停止服务。
echo.
set NODE_ENV=production
npx ts-node src/backend/index.ts

pause
