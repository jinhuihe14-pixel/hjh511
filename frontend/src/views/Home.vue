<template>
  <div class="home-page">
    <van-nav-bar title="前台开单" />
    
    <div class="page-content">
      <div class="quick-actions">
        <van-grid :column-num="3" border>
          <van-grid-item icon="add-o" text="新建订单" @click="$router.push('/create-order')" />
          <van-grid-item icon="scan" text="取鞋确认" @click="$router.push('/pickup')" />
          <van-grid-item icon="orders-o" text="我的订单" @click="$router.push('/orders')" />
        </van-grid>
      </div>

      <div class="section-title">今日统计</div>
      <van-cell-group inset>
        <van-cell title="今日接单" :value="todayStats.orderCount + ' 单'" />
        <van-cell title="今日营收" :value="'¥' + todayStats.revenue" />
      </van-cell-group>

      <div class="section-title">待处理</div>
      <van-cell-group inset>
        <van-cell title="待分派订单" :value="pendingCount + ' 单'" is-link @click="$router.push('/orders?status=pending')" />
        <van-cell title="待取鞋订单" :value="completedCount + ' 单'" is-link @click="$router.push('/orders?status=completed')" />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyOrders } from '@/api/orders'

const todayStats = ref({ orderCount: 0, revenue: 0 })
const pendingCount = ref(0)
const completedCount = ref(0)

const loadData = async () => {
  const today = new Date().toISOString().split('T')[0]
  
  const [allOrders, pendingOrders, completedOrders] = await Promise.all([
    getMyOrders({}),
    getMyOrders({ status: 'pending' }),
    getMyOrders({ status: 'completed' })
  ])

  const todayOrders = allOrders.filter(o => {
    const orderDate = new Date(o.createdAt).toISOString().split('T')[0]
    return orderDate === today
  })

  todayStats.value = {
    orderCount: todayOrders.length,
    revenue: todayOrders.reduce((sum, o) => sum + (o.actualAmount || 0), 0)
  }

  pendingCount.value = pendingOrders.length
  completedCount.value = completedOrders.length
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.quick-actions {
  margin-bottom: 20px;
}
</style>
