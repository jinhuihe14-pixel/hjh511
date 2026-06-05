<template>
  <div class="order-detail-page">
    <van-nav-bar title="订单详情" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content" v-if="order">
      <div class="status-card" :class="order.status">
        <div class="status-icon">
          <van-icon :name="getStatusIcon(order.status)" size="40" />
        </div>
        <div class="status-text">{{ getStatusText(order.status) }}</div>
        <div class="status-desc" v-if="order.status === 'completed'">
          鞋子已洗护完成，请来店取鞋
        </div>
        <div class="status-desc" v-else-if="order.status === 'picked_up'">
          您已取走鞋子，感谢您的惠顾
        </div>
        <div class="status-desc" v-else-if="order.status === 'processing'">
          正在精心洗护中，请耐心等待
        </div>
      </div>

      <van-cell-group inset>
        <van-cell title="订单号" :value="order.orderNo" />
        <van-cell title="取鞋码">
          <template #value>
            <van-tag type="primary" size="large">{{ order.pickupCode }}</van-tag>
          </template>
        </van-cell>
        <van-cell title="下单时间" :value="formatDate(order.createdAt)" />
        <van-cell v-if="order.pickedUpAt" title="取鞋时间" :value="formatDate(order.pickedUpAt)" />
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
                  {{ service.name }} ¥{{ service.price }}
                </van-tag>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div class="section-title">费用明细</div>
      <van-cell-group inset>
        <van-cell title="订单总额" :value="'¥' + order.totalAmount" />
        <van-cell title="实收金额" :value="'¥' + order.actualAmount" />
      </van-cell-group>

      <div v-if="order.notes" class="section-title">备注</div>
      <van-cell-group inset v-if="order.notes">
        <van-cell :value="order.notes" />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderById } from '@/api/orders'
import dayjs from 'dayjs'

const route = useRoute()
const order = ref(null)

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

const getStatusIcon = (status) => {
  const iconMap = {
    pending: 'clock-o',
    assigned: 'todo-list-o',
    processing: 'balance-o',
    completed: 'success',
    picked_up: 'checked',
    cancelled: 'close'
  }
  return iconMap[status] || 'info-o'
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadOrder = async () => {
  order.value = await getOrderById(route.params.id)
}

onMounted(() => {
  loadOrder()
})
</script>

<style lang="scss" scoped>
.status-card {
  text-align: center;
  padding: 40px 20px;
  color: #fff;
  margin: 16px;
  border-radius: 12px;
  
  &.pending {
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  }
  
  &.assigned {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  &.processing {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  
  &.completed {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  }
  
  &.picked_up {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  }
  
  &.cancelled {
    background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
  }
  
  .status-icon {
    margin-bottom: 16px;
  }
  
  .status-text {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 8px;
  }
  
  .status-desc {
    font-size: 14px;
    opacity: 0.9;
  }
}

.shoe-detail {
  margin-bottom: 12px;
}
</style>
