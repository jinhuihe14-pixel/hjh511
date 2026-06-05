<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">订单详情</h1>
      <div>
        <el-button @click="$router.back()">返回</el-button>
      </div>
    </div>

    <el-card shadow="hover" v-if="order">
      <el-descriptions :column="2" border class="mb-20">
        <el-descriptions-item label="订单号">{{ order.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="取鞋码">
          <el-tag type="primary" size="large">{{ order.pickupCode }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="顾客姓名">{{ order.customer?.name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ order.customer?.phone }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getStatusType(order.status)">
            {{ getStatusText(order.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收鞋店员">{{ order.receptionist?.name }}</el-descriptions-item>
        <el-descriptions-item label="洗护技工">{{ order.technician?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="翻新师傅">{{ order.repairer?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(order.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="预计取鞋">{{ order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '-' }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="mb-10">洗护鞋子</h3>
      <div v-for="(shoe, index) in order.shoes" :key="index" class="shoe-item">
        <el-divider>鞋子 {{ index + 1 }}</el-divider>
        <el-descriptions :column="2" size="small">
          <el-descriptions-item label="鞋款类型">{{ shoe.shoeType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ shoe.shoeBrand || '-' }}</el-descriptions-item>
          <el-descriptions-item label="颜色">{{ shoe.shoeColor || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="services mt-10">
          <h4>洗护项目</h4>
          <el-tag
            v-for="service in shoe.services"
            :key="service.name"
            style="margin-right: 10px; margin-bottom: 10px;"
          >
            {{ service.name }} - ¥{{ service.price }}
          </el-tag>
        </div>
      </div>

      <el-divider />

      <h3 class="mb-10">费用明细</h3>
      <el-table :data="priceDetails" size="small" border>
        <el-table-column prop="name" label="项目" />
        <el-table-column prop="price" label="金额" width="120">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
      </el-table>

      <div class="total-amount mt-20">
        <span>订单总额：</span>
        <span class="amount">¥{{ order.totalAmount }}</span>
        <span class="ml-20">实收金额：</span>
        <span class="amount actual">¥{{ order.actualAmount }}</span>
      </div>

      <el-divider v-if="order.notes" />
      <div v-if="order.notes">
        <h4>备注</h4>
        <p>{{ order.notes }}</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { getOrderById } from '@/api/orders'

const route = useRoute()
const order = ref(null)

const priceDetails = computed(() => {
  if (!order.value?.shoes) return []
  const details = []
  order.value.shoes.forEach((shoe, shoeIndex) => {
    shoe.services.forEach(service => {
      details.push({
        name: `鞋子${shoeIndex + 1} - ${service.name}`,
        price: service.price
      })
    })
  })
  return details
})

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
    assigned: 'info',
    processing: 'primary',
    completed: 'success',
    picked_up: 'success',
    cancelled: 'danger'
  }
  return typeMap[status] || 'info'
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
.shoe-item {
  border: 1px solid #eee;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 4px;
}

.services {
  h4 {
    margin-bottom: 10px;
    font-size: 14px;
  }
}

.total-amount {
  text-align: right;
  font-size: 16px;
  
  .amount {
    font-weight: 600;
    font-size: 20px;
    color: #f56c6c;
    
    &.actual {
      font-size: 24px;
      color: #67C23A;
    }
  }
}

.ml-20 {
  margin-left: 20px;
}
</style>
