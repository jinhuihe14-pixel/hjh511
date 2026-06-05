@echo off
echo ========================================
echo   洗鞋门店管理系统 - 店长后台
echo ========================================
echo.

if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

echo.
echo 启动店长后台 (端口 5173)...
echo.
npm run dev
