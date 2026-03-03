@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 启动生产服务...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 可停止服务。
echo.
set NODE_ENV=production
npx ts-node src/backend/index.ts

pause
