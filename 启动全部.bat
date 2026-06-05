@echo off
echo ========================================
echo   洗鞋门店管理系统 - 全部启动
echo ========================================
echo.
echo 请确保 MongoDB 服务已启动！
echo.
echo 服务端口说明：
echo   - 后端服务:     3000
echo   - 店长后台:     5173
echo   - 前台开单端:   5174
echo   - 技工手机端:   5175
echo   - 顾客小程序:   5176
echo.
pause

echo.
echo [1/5] 启动后端服务...
start "后端服务" cmd /k "cd server && start.bat"
timeout /t 3 /nobreak >nul

echo [2/5] 启动店长后台...
start "店长后台" cmd /k "cd admin && start.bat"
timeout /t 1 /nobreak >nul

echo [3/5] 启动前台开单端...
start "前台开单端" cmd /k "cd frontend && start.bat"
timeout /t 1 /nobreak >nul

echo [4/5] 启动技工手机端...
start "技工手机端" cmd /k "cd technician && start.bat"
timeout /t 1 /nobreak >nul

echo [5/5] 启动顾客小程序...
start "顾客小程序" cmd /k "cd mini-program && start.bat"

echo.
echo ========================================
echo   全部服务启动完成！
echo ========================================
echo.
echo 默认管理员账号: admin / admin123
echo.
pause
