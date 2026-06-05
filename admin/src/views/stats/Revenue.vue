<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">营收统计</h1>
    </div>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <p class="label">本月营收</p>
            <p class="value revenue">¥{{ monthStats.revenue || 0 }}</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <p class="label">本月订单数</p>
            <p class="value">{{ monthStats.orderCount || 0 }}</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <p class="label">客单价</p>
            <p class="value">
              ¥{{ monthStats.orderCount ? (monthStats.revenue / monthStats.orderCount).toFixed(2) : 0 }}
            </p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <p class="label">环比增长</p>
            <p class="value" :class="growthRate >= 0 ? 'up' : 'down'">
              {{ growthRate >= 0 ? '+' : '' }}{{ growthRate }}%
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" header="营收趋势">
      <div ref="revenueChart" class="chart-container"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getRevenueTrend } from '@/api/stats'

const revenueChart = ref(null)
const trendData = ref([])

const monthStats = computed(() => {
  const latest = trendData.value[trendData.value.length - 1]
  return latest || { revenue: 0, orderCount: 0 }
})

const growthRate = computed(() => {
  if (trendData.value.length < 2) return 0
  const current = trendData.value[trendData.value.length - 1]?.revenue || 0
  const prev = trendData.value[trendData.value.length - 2]?.revenue || 1
  return (((current - prev) / prev) * 100).toFixed(2)
})

const initChart = () => {
  const chart = echarts.init(revenueChart.value)
  
  const months = trendData.value.map(item => item.month)
  const revenues = trendData.value.map(item => item.revenue)
  const orders = trendData.value.map(item => item.orderCount)

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['营收', '订单数'] },
    xAxis: { type: 'category', data: months },
    yAxis: [
      { type: 'value', name: '营收(元)' },
      { type: 'value', name: '订单数' }
    ],
    series: [
      {
        name: '营收',
        type: 'line',
        smooth: true,
        data: revenues,
        areaStyle: { color: 'rgba(102, 126, 234, 0.2)' },
        lineStyle: { color: '#667eea' },
        itemStyle: { color: '#667eea' }
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: orders,
        barWidth: '30%',
        itemStyle: { color: '#67C23A' }
      }
    ]
  }

  chart.setOption(option)

  window.addEventListener('resize', () => chart.resize())
}

const loadData = async () => {
  trendData.value = await getRevenueTrend({ months: 12 })
  await nextTick()
  initChart()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.stat-item {
  text-align: center;
  
  .label {
    color: #909399;
    margin-bottom: 10px;
  }
  
  .value {
    font-size: 28px;
    font-weight: 600;
    
    &.revenue {
      color: #f56c6c;
    }
    
    &.up {
      color: #67C23A;
    }
    
    &.down {
      color: #f56c6c;
    }
  }
}

.chart-container {
  height: 400px;
}
</style>
