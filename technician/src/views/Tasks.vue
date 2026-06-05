<template>
  <div class="tasks-page">
    <van-nav-bar title="我的任务" />
    
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="待处理" name="assigned" />
      <van-tab title="处理中" name="processing" />
      <van-tab title="已完成" name="completed" />
    </van-tabs>

    <div class="page-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-card
            v-for="order in orders"
            :key="order._id"
            :title="'订单号: ' + order.orderNo"
            :desc="'取鞋码: ' + order.pickupCode"
            :tag="getStatusText(order.status)"
            :tag-type="getStatusType(order.status)"
            @click="goToDetail(order._id)"
          >
            <template #tags>
              <van-tag plain type="primary">{{ order.customer?.name }}</van-tag>
              <van-tag plain type="warning">{{ order.shoes?.length || 0 }} 双鞋</van-tag>
            </template>
            <template #footer>
              <span class="task-footer">
                <span>{{ getServiceSummary(order.shoes) }}</span>
                <span class="task-time">{{ formatDate(order.createdAt) }}</span>
              </span>
            </template>
          </van-card>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getMyTasks } from '@/api/orders'
import dayjs from 'dayjs'

const router = useRouter()
const orders = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const activeTab = ref('assigned')

const getStatusText = (status) => {
  const statusMap = {
    assigned: '待处理',
    processing: '处理中',
    completed: '已完成'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    assigned: 'warning',
    processing: 'primary',
    completed: 'success'
  }
  return typeMap[status] || 'default'
}

const formatDate = (date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

const getServiceSummary = (shoes) => {
  if (!shoes?.length) return ''
  const services = new Set()
  shoes.forEach(shoe => {
    shoe.services?.forEach(s => services.add(s.name))
  })
  return Array.from(services).join('、')
}

const goToDetail = (id) => {
  router.push(`/task-detail/${id}`)
}

const onLoad = async () => {
  const data = await getMyTasks({ status: activeTab.value })
  orders.value = data
  loading.value = false
  finished.value = true
}

const onRefresh = async () => {
  finished.value = false
  await onLoad()
  refreshing.value = false
}

watch(activeTab, () => {
  orders.value = []
  finished.value = false
  onLoad()
})
</script>

<style lang="scss" scoped>
.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 12px;
  
  .task-time {
    color: #969799;
  }
}
</style>
