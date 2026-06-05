@echo off
echo ========================================
echo   洗鞋门店管理系统 - 顾客小程序
echo ========================================
echo.

if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

echo.
echo 启动顾客小程序 (端口 5176)...
echo.
npm run dev
