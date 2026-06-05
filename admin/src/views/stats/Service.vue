<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">服务统计</h1>
      <div>
        <el-date-picker
          v-model="dateRange"
          type="monthrange"
          range-separator="至"
          start-placeholder="开始月份"
          end-placeholder="结束月份"
          format="YYYY-MM"
          value-format="YYYY-MM"
          @change="loadData"
        />
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="hover" header="服务项目销量排行">
          <div ref="serviceChart" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" header="服务类型收入占比">
          <div ref="pieChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" header="详细数据" class="mt-20">
      <el-table :data="serviceStats" border stripe>
        <el-table-column prop="name" label="服务项目" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getServiceType(row.type)">
              {{ getServiceTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="数量" width="100" sortable />
        <el-table-column prop="revenue" label="收入(元)" width="120" sortable>
          <template #default="{ row }">¥{{ row.revenue }}</template>
        </el-table-column>
        <el-table-column label="占比" width="100">
          <template #default="{ row }">
            {{ ((row.revenue / totalRevenue) * 100).toFixed(1) }}%
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getServiceStats } from '@/api/stats'

const serviceChart = ref(null)
const pieChart = ref(null)
const serviceStats = ref([])
const dateRange = ref([
  dayjs().subtract(6, 'month').format('YYYY-MM'),
  dayjs().format('YYYY-MM')
])

const totalRevenue = computed(() => {
  return serviceStats.value.reduce((sum, item) => sum + item.revenue, 0)
})

const getServiceTypeName = (type) => {
  const map = {
    cleaning: '洗护',
    repair: '维修',
    renew: '翻新',
    luxury: '奢侈品'
  }
  return map[type] || type
}

const getServiceType = (type) => {
  const map = {
    cleaning: 'primary',
    repair: 'warning',
    renew: 'success',
    luxury: 'danger'
  }
  return map[type] || 'info'
}

const initCharts = () => {
  const barChart = echarts.init(serviceChart.value)
  const pieChartInstance = echarts.init(pieChart.value)

  const top10 = serviceStats.value.slice(0, 10).reverse()

  const barOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 120 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: top10.map(item => item.name)
    },
    series: [{
      type: 'bar',
      data: top10.map(item => item.count),
      itemStyle: { color: '#667eea' },
      label: { show: true, position: 'right' }
    }]
  }

  const typeRevenue = {}
  serviceStats.value.forEach(item => {
    if (!typeRevenue[item.type]) typeRevenue[item.type] = 0
    typeRevenue[item.type] += item.revenue
  })

  const pieData = Object.entries(typeRevenue).map(([type, value]) => ({
    name: getServiceTypeName(type),
    value
  }))

  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 10 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: pieData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  barChart.setOption(barOption)
  pieChartInstance.setOption(pieOption)

  window.addEventListener('resize', () => {
    barChart.resize()
    pieChartInstance.resize()
  })
}

const loadData = async () => {
  const params = {}
  if (dateRange.value?.length === 2) {
    params.startDate = dayjs(dateRange.value[0]).startOf('month').format('YYYY-MM-DD')
    params.endDate = dayjs(dateRange.value[1]).endOf('month').format('YYYY-MM-DD')
  }
  serviceStats.value = await getServiceStats(params)
  await nextTick()
  initCharts()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.chart-container {
  height: 350px;
}
</style>
