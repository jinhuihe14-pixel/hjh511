<template>
  <div class="task-detail-page">
    <van-nav-bar title="任务详情" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content" v-if="order">
      <van-cell-group inset>
        <van-cell title="订单号" :value="order.orderNo" />
        <van-cell title="取鞋码" :value="order.pickupCode" />
        <van-cell title="订单状态">
          <template #value>
            <van-tag :type="getStatusType(order.status)">{{ getStatusText(order.status) }}</van-tag>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="section-title">顾客信息</div>
      <van-cell-group inset>
        <van-cell title="姓名" :value="order.customer?.name" />
        <van-cell title="手机号" :value="order.customer?.phone" />
      </van-cell-group>

      <div class="section-title">洗护鞋子</div>
      <div v-for="(shoe, index) in order.shoes" :key="index" class="shoe-detail">
        <van-cell-group inset>
          <van-cell title="鞋子" :value="'第 ' + (index + 1) + ' 双'" />
          <van-cell title="类型" :value="shoe.shoeType || '-'" />
          <van-cell title="品牌" :value="shoe.shoeBrand || '-'" />
          <van-cell title="颜色" :value="shoe.shoeColor || '-'" />
          <van-cell title="洗护项目">
            <template #value>
              <div>
                <van-tag
                  v-for="service in shoe.services"
                  :key="service.name"
                  style="margin-right: 5px; margin-bottom: 5px;"
                >
                  {{ service.name }}
                </van-tag>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div v-if="order.notes" class="section-title">备注</div>
      <van-cell-group inset v-if="order.notes">
        <van-cell :value="order.notes" />
      </van-cell-group>

      <div class="action-bar">
        <van-button
          v-if="order.status === 'assigned'"
          type="primary"
          block
          round
          :loading="processing"
          @click="handleStart"
        >
          开始处理
        </van-button>
        <van-button
          v-if="order.status === 'processing'"
          type="success"
          block
          round
          :loading="completing"
          @click="handleComplete"
        >
          完成洗护
        </van-button>
        <van-tag
          v-if="order.status === 'completed'"
          type="success"
          size="large"
          class="completed-tag"
        >
          已完成
        </van-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showNotify, showDialog } from 'vant'
import { getOrderById, startProcessing, completeOrder } from '@/api/orders'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const processing = ref(false)
const completing = ref(false)

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

const handleStart = async () => {
  await showDialog({
    title: '确认开始',
    message: '确定开始处理此订单？'
  })
  
  processing.value = true
  await startProcessing(route.params.id)
  showNotify({ type: 'success', message: '已开始处理' })
  order.value.status = 'processing'
  processing.value = false
}

const handleComplete = async () => {
  await showDialog({
    title: '确认完成',
    message: '确定已完成此订单的洗护工作？'
  })
  
  completing.value = true
  await completeOrder(route.params.id)
  showNotify({ type: 'success', message: '已完成洗护' })
  order.value.status = 'completed'
  completing.value = false
}

const loadOrder = async () => {
  order.value = await getOrderById(route.params.id)
}

onMounted(() => {
  loadOrder()
})
</script>

<style lang="scss" scoped>
.shoe-detail {
  margin-bottom: 12px;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.completed-tag {
  display: block;
  text-align: center;
  padding: 10px;
}
</style>
