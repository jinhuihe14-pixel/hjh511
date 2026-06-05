<template>
  <div class="profile-page">
    <div class="header">
      <div class="user-info">
        <van-icon name="user-circle-o" size="64" color="#fff" />
        <div class="user-detail">
          <div class="username">{{ customer?.name || '顾客' }}</div>
          <div class="phone">{{ customer?.phone || '' }}</div>
        </div>
      </div>
    </div>
    
    <div class="page-content">
      <van-cell-group inset class="stats-group">
        <van-grid :column-num="3" border="surround">
          <van-grid-item>
            <span class="stat-value">{{ stats.totalOrders }}</span>
            <span class="stat-label">总订单</span>
          </van-grid-item>
          <van-grid-item>
            <span class="stat-value">{{ stats.totalPairs }}</span>
            <span class="stat-label">总双数</span>
          </van-grid-item>
          <van-grid-item>
            <span class="stat-value">¥{{ stats.totalSpent }}</span>
            <span class="stat-label">累计消费</span>
          </van-grid-item>
        </van-grid>
      </van-cell-group>

      <van-cell-group inset class="menu-group">
        <van-cell title="我的订单" is-link @click="$router.push('/orders')" />
        <van-cell title="订单查询" is-link @click="$router.push('/search')" />
        <van-cell title="联系客服" is-link @click="contactService" />
        <van-cell title="关于我们" is-link @click="showAbout" />
      </van-cell-group>

      <div class="logout-section">
        <van-button type="danger" block round @click="handleLogout">
          退出登录
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import { useCustomerStore } from '@/store/customer'
import { getCustomerOrders } from '@/api/orders'

const router = useRouter()
const customerStore = useCustomerStore()

const customer = ref(null)
const stats = ref({ totalOrders: 0, totalPairs: 0, totalSpent: 0 })

const contactService = () => {
  showToast('客服电话: 400-888-8888')
}

const showAbout = () => {
  showDialog({
    title: '关于我们',
    message: '专业洗鞋服务，用心呵护每一双鞋\n门店地址：北京市朝阳区XX路XX号\n联系电话：400-888-8888'
  })
}

const handleLogout = async () => {
  await showDialog({
    title: '提示',
    message: '确定要退出登录吗？'
  })
  customerStore.logout()
  router.push('/login')
}

const loadData = async () => {
  customer.value = customerStore.customer
  
  const phone = customer.value?.phone
  if (phone) {
    const orders = await getCustomerOrders(phone, {})
    
    stats.value = {
      totalOrders: orders.length,
      totalPairs: orders.reduce((sum, o) => sum + (o.shoes?.length || 0), 0),
      totalSpent: orders.reduce((sum, o) => sum + (o.actualAmount || 0), 0)
    }
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 50px 20px 70px;
  color: #fff;
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .user-detail {
    .username {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .phone {
      font-size: 16px;
      opacity: 0.9;
    }
  }
}

.stats-group {
  margin-top: -30px;
  position: relative;
  z-index: 10;
  
  .stat-value {
    display: block;
    font-size: 22px;
    font-weight: 600;
    color: #667eea;
  }
  
  .stat-label {
    display: block;
    font-size: 12px;
    color: #646566;
    margin-top: 4px;
  }
}

.menu-group {
  margin-top: 16px;
  margin-bottom: 24px;
}

.logout-section {
  padding: 0 16px;
}
</style>
