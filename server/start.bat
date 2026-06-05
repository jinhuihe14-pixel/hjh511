@echo off
echo ========================================
echo   洗鞋门店管理系统 - 后端服务启动
echo ========================================
echo.

if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

echo.
echo 启动后端服务 (端口 3000)...
echo.
npm run dev
