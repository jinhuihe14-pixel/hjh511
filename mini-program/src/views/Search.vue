<template>
  <div class="search-page">
    <van-nav-bar title="查询订单" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content">
      <div class="search-section">
        <van-search
          v-model="pickupCode"
          placeholder="请输入取鞋码"
          show-action
          @search="searchOrder"
        >
          <template #action>
            <div @click="searchOrder">搜索</div>
          </template>
        </van-search>
      </div>

      <div v-if="order" class="order-result">
        <van-card
          :title="'订单号: ' + order.orderNo"
          :desc="'取鞋码: ' + order.pickupCode"
          :tag="getStatusText(order.status)"
          :tag-type="getStatusType(order.status)"
          @click="$router.push(`/order-detail/${order._id}`)"
        >
          <template #tags>
            <van-tag plain type="primary">{{ order.customer?.name }}</van-tag>
            <van-tag plain type="warning">{{ order.shoes?.length || 0 }} 双鞋</van-tag>
          </template>
          <template #footer>
            <span class="order-footer">
              <span>实收: ¥{{ order.actualAmount }}</span>
              <span class="order-time">{{ formatDate(order.createdAt) }}</span>
            </span>
          </template>
        </van-card>
        
        <van-cell-group inset class="action-group">
          <van-cell title="查看订单详情" is-link @click="$router.push(`/order-detail/${order._id}`)" />
        </van-cell-group>
      </div>

      <div v-else-if="searched && !order" class="empty-tip">
        <van-empty description="未找到订单，请检查取鞋码" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showNotify } from 'vant'
import { getOrderByPickupCode } from '@/api/orders'
import dayjs from 'dayjs'

const pickupCode = ref('')
const order = ref(null)
const searched = ref(false)

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

const searchOrder = async () => {
  if (!pickupCode.value) {
    showNotify({ type: 'warning', message: '请输入取鞋码' })
    return
  }
  
  try {
    searched.value = true
    order.value = await getOrderByPickupCode(pickupCode.value)
  } catch (e) {
    order.value = null
  }
}
</script>

<style lang="scss" scoped>
.search-section {
  margin-bottom: 20px;
}

.order-result {
  padding-bottom: 20px;
}

.action-group {
  margin-top: 16px;
}

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

.empty-tip {
  padding-top: 60px;
}
</style>
