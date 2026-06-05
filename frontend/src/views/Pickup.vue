<template>
  <div class="pickup-page">
    <van-nav-bar title="取鞋确认" left-text="返回" left-arrow @click-left="$router.back()" />
    
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
        <van-cell-group inset>
          <van-cell title="订单号" :value="order.orderNo" />
          <van-cell title="顾客" :value="order.customer?.name" />
          <van-cell title="手机号" :value="order.customer?.phone" />
          <van-cell title="鞋子数量" :value="order.shoes?.length + ' 双'" />
          <van-cell title="实收金额" :value="'¥' + order.actualAmount" />
          <van-cell title="订单状态">
            <template #value>
              <van-tag :type="getStatusType(order.status)">{{ getStatusText(order.status) }}</van-tag>
            </template>
          </van-cell>
        </van-cell-group>

        <div class="section-title">鞋子明细</div>
        <van-cell-group inset>
          <div v-for="(shoe, index) in order.shoes" :key="index" class="shoe-item">
            <van-cell :title="'鞋子 ' + (index + 1)" :value="shoe.shoeType" />
          </div>
        </van-cell-group>

        <div class="action-section" v-if="order.status === 'completed'">
          <van-button type="primary" block round @click="confirmPickup">
            确认取鞋
          </van-button>
        </div>

        <div class="action-section" v-else-if="order.status === 'picked_up'">
          <van-tag type="success" size="large">此订单已取鞋</van-tag>
        </div>
      </div>

      <div v-else-if="searched && !order" class="empty-tip">
        <van-empty description="未找到订单，请检查取鞋码" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showNotify, showDialog } from 'vant'
import { getOrderByPickupCode, updateOrderStatus } from '@/api/orders'

const pickupCode = ref('')
const order = ref(null)
const searched = ref(false)

const getStatusText = (status) => {
  const statusMap = {
    pending: '待分派',
    assigned: '已分派',
    processing: '处理中',
    completed: '已完成',
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

const confirmPickup = async () => {
  await showDialog({
    title: '确认取鞋',
    message: '确认顾客已取走鞋子？'
  })
  
  await updateOrderStatus(order.value._id, 'picked_up')
  showNotify({ type: 'success', message: '取鞋确认成功' })
  order.value.status = 'picked_up'
}
</script>

<style lang="scss" scoped>
.search-section {
  margin-bottom: 20px;
}

.order-result {
  padding-bottom: 20px;
}

.section-title {
  padding: 12px 16px;
  color: #646566;
  font-size: 14px;
}

.action-section {
  padding: 20px 16px;
  text-align: center;
}

.empty-tip {
  padding-top: 60px;
}
</style>
