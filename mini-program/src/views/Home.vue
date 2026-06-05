<template>
  <div class="home-page">
    <div class="header">
      <div class="welcome">
        <h3>您好，{{ customer?.name || '顾客' }}</h3>
        <p>欢迎使用洗鞋服务</p>
      </div>
    </div>
    
    <div class="page-content">
      <div class="quick-actions">
        <van-grid :column-num="4" border>
          <van-grid-item icon="search" text="查订单" @click="$router.push('/search')" />
          <van-grid-item icon="orders-o" text="我的订单" @click="$router.push('/orders')" />
          <van-grid-item icon="phone-o" text="联系门店" @click="contactStore" />
          <van-grid-item icon="location-o" text="门店地址" @click="showLocation" />
        </van-grid>
      </div>

      <div class="section-header">
        <span class="section-title">服务项目</span>
      </div>
      <van-cell-group inset>
        <van-cell title="运动鞋洗护" value="¥35起" is-link />
        <van-cell title="皮鞋翻新" value="¥80起" is-link />
        <van-cell title="奢侈品护理" value="¥200起" is-link />
        <van-cell title="换底修补" value="¥120起" is-link />
      </van-cell-group>

      <div class="section-header">
        <span class="section-title">最近订单</span>
        <span class="more" @click="$router.push('/orders')">查看全部 ></span>
      </div>
      <van-cell-group inset v-if="recentOrders.length">
        <van-cell
          v-for="order in recentOrders"
          :key="order._id"
          :title="'订单号: ' + order.orderNo"
          :label="getServiceSummary(order.shoes)"
          is-link
          @click="$router.push(`/order-detail/${order._id}`)"
        >
          <template #value>
            <van-tag :type="getStatusType(order.status)">{{ getStatusText(order.status) }}</van-tag>
          </template>
        </van-cell>
      </van-cell-group>
      <div v-else class="empty-tip">
        <van-empty description="暂无订单" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { useCustomerStore } from '@/store/customer'
import { getCustomerOrders } from '@/api/orders'

const customerStore = useCustomerStore()
const customer = ref(null)
const recentOrders = ref([])

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

const getServiceSummary = (shoes) => {
  if (!shoes?.length) return ''
  const services = new Set()
  shoes.forEach(shoe => {
    shoe.services?.forEach(s => services.add(s.name))
  })
  return Array.from(services).join('、')
}

const contactStore = () => {
  showToast('联系电话: 400-888-8888')
}

const showLocation = () => {
  showToast('门店地址: 北京市朝阳区XX路XX号')
}

const loadData = async () => {
  customer.value = customerStore.customer
  if (customer.value?.phone) {
    const orders = await getCustomerOrders(customer.value.phone, {})
    recentOrders.value = orders.slice(0, 3)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px 60px;
  color: #fff;
  
  .welcome h3 {
    font-size: 22px;
    margin-bottom: 6px;
  }
  
  .welcome p {
    opacity: 0.9;
  }
}

.quick-actions {
  margin-top: -30px;
  padding: 0 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  
  .section-title {
    font-weight: 600;
    font-size: 16px;
  }
  
  .more {
    font-size: 14px;
    color: #646566;
  }
}

.empty-tip {
  padding: 40px 0;
}
</style>
