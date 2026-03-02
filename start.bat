@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动服务...
echo.

REM 在新窗口中启动后端（/D 指定工作目录，避免路径引号问题）
start "Backend" /D "%~dp0" cmd /k "npm run dev"

REM 等待 2 秒再启动前端
timeout /t 2 /nobreak >nul

REM 在新窗口中启动前端
start "Frontend" /D "%~dp0" cmd /k "npm run dev:2"

echo.
echo 已启动两个窗口：后端服务、前端服务
echo 关闭对应窗口即可停止该服务。
pause
