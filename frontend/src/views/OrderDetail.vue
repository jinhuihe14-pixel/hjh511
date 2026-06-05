<template>
  <div class="order-detail-page">
    <van-nav-bar title="订单详情" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content" v-if="order">
      <van-cell-group inset>
        <van-cell title="订单号" :value="order.orderNo" />
        <van-cell title="取鞋码">
          <template #value>
            <van-tag type="primary" size="large">{{ order.pickupCode }}</van-tag>
          </template>
        </van-cell>
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

      <div class="section-title">处理人员</div>
      <van-cell-group inset>
        <van-cell title="收鞋店员" :value="order.receptionist?.name || '-'" />
        <van-cell title="洗护技工" :value="order.technician?.name || '-'" />
        <van-cell title="翻新师傅" :value="order.repairer?.name || '-'" />
      </van-cell-group>

      <div v-if="order.notes" class="section-title">备注</div>
      <van-cell-group inset v-if="order.notes">
        <van-cell :value="order.notes" />
      </van-cell-group>

      <div class="action-bar" v-if="order.status === 'completed'">
        <van-button type="primary" block round @click="confirmPickup">
          确认取鞋
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showNotify, showDialog } from 'vant'
import { getOrderById, updateOrderStatus } from '@/api/orders'

const route = useRoute()
const router = useRouter()
const order = ref(null)

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

const confirmPickup = async () => {
  await showDialog({
    title: '确认取鞋',
    message: '确认顾客已取走鞋子？'
  })
  
  await updateOrderStatus(route.params.id, 'picked_up')
  showNotify({ type: 'success', message: '取鞋确认成功' })
  router.back()
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
</style>
