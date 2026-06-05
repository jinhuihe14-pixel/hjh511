@echo off
echo ========================================
echo   洗鞋门店管理系统 - 前台开单端
echo ========================================
echo.

if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

echo.
echo 启动前台开单端 (端口 5174)...
echo.
npm run dev
