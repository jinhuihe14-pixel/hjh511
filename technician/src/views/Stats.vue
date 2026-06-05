<template>
  <div class="stats-page">
    <van-nav-bar title="计件统计" />
    
    <div class="page-content">
      <div class="stats-summary">
        <van-grid :column-num="3" border="surround">
          <van-grid-item>
            <span class="stat-value">{{ todayStats.completed }}</span>
            <span class="stat-label">今日完成</span>
          </van-grid-item>
          <van-grid-item>
            <span class="stat-value">{{ todayStats.pairs }}</span>
            <span class="stat-label">今日双数</span>
          </van-grid-item>
          <van-grid-item>
            <span class="stat-value">{{ monthStats.pairs }}</span>
            <span class="stat-label">本月双数</span>
          </van-grid-item>
        </van-grid>
      </div>

      <div class="section-title">每日统计</div>
      <van-cell-group inset>
        <div v-for="(item, index) in dailyStats" :key="index" class="daily-item">
          <van-cell :title="item.date" :value="item.pairs + ' 双 / ' + item.count + ' 单'" />
        </div>
      </van-cell-group>

      <div class="section-title">洗护类型分布</div>
      <van-cell-group inset>
        <van-cell
          v-for="(item, index) in serviceStats"
          :key="index"
          :title="item.name"
          :value="item.count + ' 双'"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyTasks } from '@/api/orders'
import dayjs from 'dayjs'

const todayStats = ref({ completed: 0, pairs: 0 })
const monthStats = ref({ pairs: 0 })
const dailyStats = ref([])
const serviceStats = ref([])

const loadStats = async () => {
  const allOrders = await getMyTasks({ status: 'completed' })
  
  const today = dayjs().format('YYYY-MM-DD')
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
  
  const todayOrders = allOrders.filter(o => 
    dayjs(o.completedAt || o.updatedAt).format('YYYY-MM-DD') === today
  )
  
  const monthOrders = allOrders.filter(o => 
    dayjs(o.completedAt || o.updatedAt).format('YYYY-MM-DD') >= monthStart
  )
  
  todayStats.value = {
    completed: todayOrders.length,
    pairs: todayOrders.reduce((sum, o) => sum + (o.shoes?.length || 0), 0)
  }
  
  monthStats.value = {
    pairs: monthOrders.reduce((sum, o) => sum + (o.shoes?.length || 0), 0)
  }

  const dailyMap = {}
  const serviceMap = {}
  
  monthOrders.forEach(order => {
    const date = dayjs(order.completedAt || order.updatedAt).format('MM-DD')
    if (!dailyMap[date]) {
      dailyMap[date] = { date, pairs: 0, count: 0 }
    }
    dailyMap[date].pairs += order.shoes?.length || 0
    dailyMap[date].count += 1
    
    order.shoes?.forEach(shoe => {
      shoe.services?.forEach(s => {
        if (!serviceMap[s.name]) {
          serviceMap[s.name] = { name: s.name, count: 0 }
        }
        serviceMap[s.name].count += 1
      })
    })
  })
  
  dailyStats.value = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date))
  serviceStats.value = Object.values(serviceMap).sort((a, b) => b.count - a.count)
}

onMounted(() => {
  loadStats()
})
</script>

<style lang="scss" scoped>
.stats-summary {
  margin: 16px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #07c160;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #646566;
  margin-top: 4px;
}

.daily-item {
  .van-cell__value {
    color: #07c160;
  }
}
</style>
