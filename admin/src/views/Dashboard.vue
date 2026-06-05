<template>
  <div class="dashboard">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card card-blue">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">今日订单</p>
            <p class="stat-value">{{ stats.todayOrders || 0 }}</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card card-green">
          <div class="stat-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">今日营收</p>
            <p class="stat-value">¥{{ stats.todayRevenue || 0 }}</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card card-orange">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">待处理订单</p>
            <p class="stat-value">{{ stats.pendingOrders || 0 }}</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card card-purple">
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">会员总数</p>
            <p class="stat-value">{{ stats.totalCustomers || 0 }}</p>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="12">
        <el-card shadow="hover" header="本月营收趋势">
          <div ref="revenueChart" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" header="本月订单趋势">
          <div ref="orderChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="hover" header="超期未取提醒">
          <el-alert
            title="超期订单提醒"
            :description="`当前有 ${stats.overdueOrders || 0} 个订单已超30天未取，请及时通知顾客`"
            type="warning"
            :closable="false"
            show-icon
            class="mb-20"
          />
          <el-button type="primary" @click="$router.push('/orders?status=completed')">
            查看待取订单
          </el-button>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" header="快速操作">
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/orders')">
              订单管理
            </el-button>
            <el-button type="success" @click="$router.push('/salary/records')">
              薪资核算
            </el-button>
            <el-button type="warning" @click="$router.push('/stats/revenue')">
              营收统计
            </el-button>
            <el-button type="info" @click="$router.push('/employees')">
              员工管理
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getDashboardStats, getRevenueTrend } from '@/api/stats'

const stats = ref({})
const revenueChart = ref(null)
const orderChart = ref(null)

const initCharts = (trendData) => {
  const revenueChartInstance = echarts.init(revenueChart.value)
  const orderChartInstance = echarts.init(orderChart.value)
  
  const months = trendData.map(item => item.month)
  const revenues = trendData.map(item => item.revenue)
  const orders = trendData.map(item => item.orderCount)

  const revenueOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{
      data: revenues,
      type: 'line',
      smooth: true,
      areaStyle: { color: 'rgba(102, 126, 234, 0.2)' },
      lineStyle: { color: '#667eea' },
      itemStyle: { color: '#667eea' }
    }]
  }

  const orderOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{
      data: orders,
      type: 'bar',
      barWidth: '40%',
      itemStyle: { color: '#67C23A' }
    }]
  }

  revenueChartInstance.setOption(revenueOption)
  orderChartInstance.setOption(orderOption)

  window.addEventListener('resize', () => {
    revenueChartInstance.resize()
    orderChartInstance.resize()
  })
}

const loadData = async () => {
  const [dashboardData, trendData] = await Promise.all([
    getDashboardStats(),
    getRevenueTrend({ months: 6 })
  ])
  stats.value = dashboardData
  
  await nextTick()
  initCharts(trendData)
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  color: #fff;
  
  &.card-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  &.card-green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
  &.card-orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
  &.card-purple { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
  
  .stat-icon {
    font-size: 48px;
    margin-right: 20px;
    opacity: 0.8;
  }
  
  .stat-content {
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
  }
}

.chart-container {
  height: 300px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
