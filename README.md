# 社区连锁洗鞋门店全栈管理系统

## 项目概述

本系统为社区连锁洗鞋门店提供完整的数字化管理解决方案，包含店长后台、前台开单端、技工手机端、顾客微信小程序四大终端。

## 技术栈

### 后端
- Node.js + Express.js
- MongoDB + Mongoose
- JWT 身份认证
- node-cron 定时任务

### 店长后台 (admin/)
- Vue 3 + Vite
- Element Plus
- Pinia 状态管理
- ECharts 数据可视化

### 前台开单端 (frontend/)
- Vue 3 + Vite
- Vant UI（移动端）
- Pinia 状态管理

### 技工手机端 (technician/)
- Vue 3 + Vite
- Vant UI（移动端）
- Pinia 状态管理

### 顾客微信小程序 (mini-program/)
- Vue 3 + Vite
- Vant UI（移动端H5版本）
- Pinia 状态管理

## 核心功能

### 1. 多角色权限管理
- **店长(admin)**: 系统管理、薪资配置、数据统计
- **前台(receptionist)**: 开单、取鞋、顾客管理
- **技工(technician)**: 订单处理、计件统计
- **翻新师傅(repairer)**: 维修项目处理

### 2. 薪资自动核算系统
- 各岗位底薪配置
- 前台按接单金额提成
- 技工按洗护双数计件
- 翻新师傅按维修项目提成
- 全勤奖、迟到扣款
- 配置修改次月生效
- 薪资锁定机制

### 3. 订单全流程管理
- 前台开单，自动生成取鞋码
- 订单分派技工
- 技工手机端接单、完成
- 前台确认取鞋
- 超期寄存自动提醒

### 4. 数据统计报表
- 门店月度营收
- 洗护项目销量统计
- 员工业绩排行
- 热门洗护品类分析

## 快速开始

### 环境要求
- Node.js >= 16.x
- MongoDB >= 4.x

### 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装店长后台依赖
cd ../admin
npm install

# 安装前台开单端依赖
cd ../frontend
npm install

# 安装技工手机端依赖
cd ../technician
npm install

# 安装顾客小程序依赖
cd ../mini-program
npm install
```

### 配置环境变量

在 `server/` 目录下创建 `.env` 文件：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/shoe_wash
JWT_SECRET=your_jwt_secret_key
```

### 启动服务

```bash
# 启动后端服务 (端口 3000)
cd server
npm run dev

# 启动店长后台 (端口 5173)
cd ../admin
npm run dev

# 启动前台开单端 (端口 5174)
cd ../frontend
npm run dev

# 启动技工手机端 (端口 5175)
cd ../technician
npm run dev

# 启动顾客小程序 (端口 5176)
cd ../mini-program
npm run dev
```

### 初始化管理员账号

启动后端服务后，访问以下接口初始化管理员：
```
POST /api/auth/init-admin
Body: { username: "admin", password: "admin123" }
```

## 默认测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 店长 | admin | admin123 |
| 前台 | receptionist01 | 123456 |
| 技工 | technician01 | 123456 |
| 翻新师傅 | repairer01 | 123456 |

## 项目结构

```
shoe-wash-system/
├── server/              # 后端服务
│   ├── src/
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # API路由
│   │   ├── middleware/  # 中间件
│   │   └── index.js     # 入口文件
│   └── package.json
├── admin/               # 店长后台
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── api/         # API接口
│   │   └── store/       # 状态管理
│   └── package.json
├── frontend/            # 前台开单端
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── api/         # API接口
│   │   └── store/       # 状态管理
│   └── package.json
├── technician/          # 技工手机端
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── api/         # API接口
│   │   └── store/       # 状态管理
│   └── package.json
└── mini-program/        # 顾客小程序
    ├── src/
    │   ├── views/       # 页面组件
    │   ├── api/         # API接口
    │   └── store/       # 状态管理
    └── package.json
```

## 业务流程

1. **顾客送鞋** → 前台开单录入信息 → 生成取鞋码
2. **店长分派** → 订单分配给对应技工
3. **技工洗护** → 开始处理 → 完成洗护
4. **顾客取鞋** → 前台扫码确认 → 订单完成
5. **月末核算** → 系统自动计算薪资 → 店长确认锁定

## 注意事项

1. 薪资配置修改后次月生效
2. 订单寄存超30天自动发送提醒
3. 薪资锁定后不可修改
4. 每笔提成都可溯源到原始订单
