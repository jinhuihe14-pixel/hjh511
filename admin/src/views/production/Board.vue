<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">生产看板</h1>
      <div>
        <el-button type="primary" @click="loadData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card card-blue">
          <div class="stat-icon">
            <el-icon><Tools /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">在制鞋子</p>
            <p class="stat-value">{{ totalInProgress }}</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card card-orange">
          <div class="stat-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">返工中</p>
            <p class="stat-value">{{ reworkCount }}</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card card-red">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">预计超时</p>
            <p class="stat-value">{{ overdueCount }}</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card card-purple">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">工序数</p>
            <p class="stat-value">{{ processColumns.length }}</p>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="board-container" v-loading="loading">
      <div class="board-columns">
        <div
          v-for="column in processColumns"
          :key="column.key"
          class="board-column"
        >
          <div class="column-header">
            <span class="column-title">{{ column.name }}</span>
            <el-tag type="primary" size="small" effect="dark">{{ column.count }}</el-tag>
          </div>
          
          <div class="column-items">
            <div
              v-for="item in column.items"
              :key="`${item.orderId}-${item.shoeIndex}`"
              class="kanban-card"
              :class="{
                'is-rework': item.isRework,
                'is-overdue': item.isOverdue
              }"
              @click="viewOrderDetail(item.orderId)"
            >
              <div class="card-header">
                <span class="order-no">{{ item.orderNo }}</span>
                <el-tag 
                  v-if="item.isRework" 
                  type="danger" 
                  size="small"
                >
                  返工{{ item.totalReworkCount }}次
                </el-tag>
                <el-tag 
                  v-else-if="item.isOverdue" 
                  type="warning" 
                  size="small"
                >
                  预计超时
                </el-tag>
              </div>
              
              <div class="card-body">
                <div class="shoe-info">
                  <span class="shoe-brand">{{ item.shoeInfo?.shoeBrand || '未知' }}</span>
                  <span class="shoe-type">{{ item.shoeInfo?.shoeType || '' }}</span>
                </div>
                <div class="customer">{{ item.customer?.name || '未知顾客' }}</div>
              </div>

              <div class="card-footer">
                <span class="stay-time">
                  停留: {{ formatDuration(item.stayDuration) }}
                </span>
                <span class="delivery" :class="{ 'overdue': item.isOverdue }">
                  {{ item.estimatedDelivery ? formatDate(item.estimatedDelivery) : '无预计' }}
                </span>
              </div>
            </div>

            <div v-if="column.items.length === 0" class="empty-column">
              <el-empty description="暂无" :image-size="60" />
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProductionBoard } from '@/api/orders'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const boardData = ref({ columns: [] })

const processColumns = computed(() => boardData.value.columns || [])

const totalInProgress = computed(() => {
  return processColumns.value.reduce((sum, col) => sum + col.count, 0)
})

const reworkCount = computed(() => {
  let count = 0
  processColumns.value.forEach(col => {
    col.items.forEach(item => {
      if (item.isRework) count++
    })
  })
  return count
})

const overdueCount = computed(() => {
  let count = 0
  processColumns.value.forEach(col => {
    col.items.forEach(item => {
      if (item.isOverdue) count++
    })
  })
  return count
})

const formatDuration = (minutes) => {
  if (!minutes) return '0分钟'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return `${hours}小时${mins > 0 ? mins + '分' : ''}`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `${days}天${remainHours > 0 ? remainHours + '小时' : ''}`
}

const formatDate = (date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

const loadData = async () => {
  try {
    loading.value = true
    const data = await getProductionBoard()
    boardData.value = data
  } catch (error) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const viewOrderDetail = (orderId) => {
  router.push(`/orders/${orderId}`)
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.board-container {
  min-height: 600px;
  overflow-x: auto;
}

.board-columns {
  display: flex;
  gap: 16px;
  min-width: max-content;
}

.board-column {
  flex: 0 0 260px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 280px);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
  margin-bottom: 12px;
}

.column-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.column-items {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 2px;
  }
}

.kanban-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  border-left: 3px solid #409eff;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.is-rework {
    border-left-color: #f56c6c;
    background: #fef0f0;
  }

  &.is-overdue {
    border-left-color: #e6a23c;
  }

  &.is-overdue.is-rework {
    border-left-color: #f56c6c;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-no {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.card-body {
  margin-bottom: 8px;
}

.shoe-info {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.shoe-brand {
  font-weight: 500;
  margin-right: 6px;
}

.shoe-type {
  color: #909399;
  font-size: 12px;
}

.customer {
  font-size: 12px;
  color: #909399;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #909399;
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
}

.stay-time {
  color: #67c23a;
}

.delivery {
  &.overdue {
    color: #f56c6c;
    font-weight: 500;
  }
}

.empty-column {
  padding: 20px 0;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  color: #fff;
  
  &.card-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  &.card-orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
  &.card-red { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); }
  &.card-purple { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
  
  .stat-icon {
    font-size: 40px;
    margin-right: 16px;
    opacity: 0.8;
  }
  
  .stat-content {
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
  }
}

.mb-20 {
  margin-bottom: 20px;
}
</style>
