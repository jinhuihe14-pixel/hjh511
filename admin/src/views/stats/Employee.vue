<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">员工业绩</h1>
      <el-select v-model="selectedMonth" placeholder="选择月份" style="width: 150px;">
        <el-option
          v-for="m in recentMonths"
          :key="m"
          :label="m"
          :value="m"
        />
      </el-select>
    </div>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="hover" header="前台接单排行">
          <el-table :data="performance.receptionists || []" border stripe>
            <el-table-column type="index" label="排名" width="80" align="center">
              <template #default="{ $index }">
                <el-tag v-if="$index === 0" type="danger" size="small">第1名</el-tag>
                <el-tag v-else-if="$index === 1" type="warning" size="small">第2名</el-tag>
                <el-tag v-else-if="$index === 2" type="success" size="small">第3名</el-tag>
                <span v-else>{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="orderCount" label="接单数量" width="120" />
            <el-table-column prop="revenue" label="接单金额" width="120">
              <template #default="{ row }">¥{{ row.revenue || 0 }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" header="技工计件排行">
          <el-table :data="performance.technicians || []" border stripe>
            <el-table-column type="index" label="排名" width="80" align="center">
              <template #default="{ $index }">
                <el-tag v-if="$index === 0" type="danger" size="small">第1名</el-tag>
                <el-tag v-else-if="$index === 1" type="warning" size="small">第2名</el-tag>
                <el-tag v-else-if="$index === 2" type="success" size="small">第3名</el-tag>
                <span v-else>{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="orderCount" label="完成订单" width="120" />
            <el-table-column prop="pieceCount" label="计件数量" width="120">
              <template #default="{ row }">{{ row.pieceCount || 0 }} 双</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" header="业绩对比图" class="mt-20">
      <div ref="performanceChart" class="chart-container"></div>
    </el-card>

    <el-card shadow="hover" header="工序统计明细" class="mt-20">
      <div class="filter-bar">
        <el-select v-model="selectedRole" placeholder="选择角色" style="width: 150px;" clearable>
          <el-option label="前台" value="receptionist" />
          <el-option label="技工" value="technician" />
          <el-option label="翻新师" value="repairer" />
          <el-option label="质检" value="inspector" />
        </el-select>
      </div>
      <el-table :data="filteredProcessStats" border stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getRoleTagType(row.role)">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="completedCount" label="完成工序数" width="120" align="center" />
        <el-table-column prop="inProgressCount" label="在制工序数" width="120" align="center" />
        <el-table-column prop="avgDuration" label="平均耗时(分)" width="120" align="center" />
        <el-table-column prop="reworkCount" label="返工次数" width="100" align="center" />
        <el-table-column label="返工率" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              size="small" 
              :type="row.reworkRate > 0.1 ? 'danger' : row.reworkRate > 0.05 ? 'warning' : 'success'"
            >
              {{ (row.reworkRate * 100).toFixed(1) }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="工序明细">
          <template #default="{ row }">
            <div class="process-breakdown">
              <el-tag 
                v-for="item in row.processBreakdown" 
                :key="item.name" 
                size="small" 
                style="margin-right: 5px; margin-bottom: 5px;"
              >
                {{ item.name }}: {{ item.count }}次
              </el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getEmployeePerformance } from '@/api/stats'
import { getEmployeeProcessStats } from '@/api/orders'

const selectedMonth = ref(dayjs().format('YYYY-MM'))
const performance = ref({})
const performanceChart = ref(null)
const processStats = ref([])
const selectedRole = ref('')

const recentMonths = (() => {
  const months = []
  for (let i = 0; i < 6; i++) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'))
  }
  return months
})()

const filteredProcessStats = computed(() => {
  if (!selectedRole.value) return processStats.value
  return processStats.value.filter(s => s.role === selectedRole.value)
})

const getRoleText = (role) => {
  const map = {
    admin: '管理员',
    receptionist: '前台',
    technician: '技工',
    repairer: '翻新师',
    inspector: '质检员'
  }
  return map[role] || role
}

const getRoleTagType = (role) => {
  const map = {
    admin: 'danger',
    receptionist: 'primary',
    technician: 'success',
    repairer: 'warning',
    inspector: 'info'
  }
  return map[role] || ''
}

const initChart = () => {
  const chart = echarts.init(performanceChart.value)

  const receptionistNames = (performance.value.receptionists || []).map(r => r.name)
  const receptionistRevenues = (performance.value.receptionists || []).map(r => r.revenue || 0)

  const technicianNames = (performance.value.technicians || []).map(t => t.name)
  const technicianPieces = (performance.value.technicians || []).map(t => t.pieceCount || 0)

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['前台接单金额', '技工计件数量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: [
      {
        type: 'category',
        data: receptionistNames,
        name: '前台员工'
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '接单金额(元)'
      },
      {
        type: 'value',
        name: '计件数量(双)'
      }
    ],
    series: [
      {
        name: '前台接单金额',
        type: 'bar',
        data: receptionistRevenues,
        itemStyle: { color: '#667eea' },
        barWidth: '30%'
      }
    ]
  }

  chart.setOption(option)

  window.addEventListener('resize', () => chart.resize())
}

const loadData = async () => {
  const startDate = dayjs(selectedMonth.value).startOf('month').format('YYYY-MM-DD')
  const endDate = dayjs(selectedMonth.value).endOf('month').format('YYYY-MM-DD')
  
  const [perfData, procData] = await Promise.all([
    getEmployeePerformance({ month: selectedMonth.value }),
    getEmployeeProcessStats({ startDate, endDate })
  ])
  
  performance.value = perfData
  processStats.value = procData
  
  await nextTick()
  initChart()
}

watch(selectedMonth, () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.chart-container {
  height: 400px;
}

.filter-bar {
  margin-bottom: 15px;
}

.process-breakdown {
  display: flex;
  flex-wrap: wrap;
}

.mt-20 {
  margin-top: 20px;
}
</style>
