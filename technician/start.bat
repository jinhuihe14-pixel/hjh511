@echo off
echo ========================================
echo   洗鞋门店管理系统 - 技工手机端
echo ========================================
echo.

if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

echo.
echo 启动技工手机端 (端口 5175)...
echo.
npm run dev
