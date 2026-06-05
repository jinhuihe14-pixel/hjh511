<template>
  <div class="orders-page">
    <van-nav-bar title="我的订单" />
    
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="全部" name="all" />
      <van-tab title="洗护中" name="processing" />
      <van-tab title="待取鞋" name="completed" />
      <van-tab title="已完成" name="picked_up" />
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
              <van-tag plain type="warning">{{ order.shoes?.length || 0 }} 双鞋</van-tag>
            </template>
            <template #footer>
              <span class="order-footer">
                <span>实收: ¥{{ order.actualAmount }}</span>
                <span class="order-time">{{ formatDate(order.createdAt) }}</span>
              </span>
            </template>
          </van-card>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/store/customer'
import { getCustomerOrders } from '@/api/orders'
import dayjs from 'dayjs'

const router = useRouter()
const customerStore = useCustomerStore()
const orders = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const activeTab = ref('all')

const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    assigned: '已分派',
    processing: '洗护中',
    completed: '待取鞋',
    picked_up: '已取鞋',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    assigned: 'primary',
    processing: 'info',
    completed: 'success',
    picked_up: 'success',
    cancelled: 'danger'
  }
  return typeMap[status] || 'default'
}

const formatDate = (date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

const goToDetail = (id) => {
  router.push(`/order-detail/${id}`)
}

const onLoad = async () => {
  const params = {}
  if (activeTab.value !== 'all') {
    params.status = activeTab.value
  }

  const phone = customerStore.customer?.phone
  if (phone) {
    const data = await getCustomerOrders(phone, params)
    orders.value = data
  }
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

onMounted(() => {
  onLoad()
})
</script>

<style lang="scss" scoped>
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  
  .order-time {
    color: #969799;
    font-size: 12px;
  }
}
</style>
