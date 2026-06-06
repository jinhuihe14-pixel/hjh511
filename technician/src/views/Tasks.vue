<template>
  <div class="tasks-page">
    <van-nav-bar title="我的工序任务" />
    
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="待领取" name="pending" />
      <van-tab title="进行中" name="in_progress" />
      <van-tab title="已完成" name="completed" />
    </van-tabs>

    <div class="page-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <div
            v-for="task in tasks"
            :key="`${task.orderId}-${task.shoeIndex}-${task.processKey}`"
            class="task-item"
            @click="goToDetail(task)"
          >
            <div class="task-header">
              <span class="task-order-no">{{ task.orderNo }}</span>
              <van-tag 
                :type="getProcessStatusType(task.processStatus)"
                size="medium"
              >
                {{ getProcessStatusText(task.processStatus) }}
              </van-tag>
            </div>
            
            <div class="task-body">
              <div class="process-info">
                <span class="process-name">{{ task.processName }}</span>
                <span v-if="task.totalReworkCount > 0" class="rework-badge">
                  返工{{ task.totalReworkCount }}次
                </span>
              </div>
              <div class="shoe-info">
                <span>{{ task.shoeInfo.shoeBrand || '未知品牌' }}</span>
                <span class="divider">·</span>
                <span>{{ task.shoeInfo.shoeType || '未知类型' }}</span>
              </div>
            </div>

            <div class="task-footer">
              <span class="customer-name">{{ task.customer?.name }}</span>
              <span v-if="task.isOverdueWarning" class="overdue-warning">
                <van-icon name="warning-o" /> 预计超时
              </span>
              <span class="task-time">{{ formatDate(task.createdAt) }}</span>
            </div>

            <div v-if="!task.canStart && task.processStatus === 'pending'" class="blocked-hint">
              <van-icon name="clock-o" /> 前置工序未完成
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showNotify } from 'vant'
import { getMyProcessTasks } from '@/api/orders'
import dayjs from 'dayjs'

const router = useRouter()
const tasks = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const activeTab = ref('pending')

const getProcessStatusText = (status) => {
  const statusMap = {
    pending: '待领取',
    in_progress: '进行中',
    rework: '返工中',
    completed: '已完成'
  }
  return statusMap[status] || status
}

const getProcessStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    in_progress: 'primary',
    rework: 'danger',
    completed: 'success'
  }
  return typeMap[status] || 'default'
}

const formatDate = (date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

const goToDetail = (task) => {
  router.push({
    path: '/task-detail',
    query: {
      orderId: task.orderId,
      shoeIndex: task.shoeIndex,
      processKey: task.processKey
    }
  })
}

const onLoad = async () => {
  try {
    const statusMap = {
      pending: 'pending',
      in_progress: 'in_progress',
      completed: 'completed'
    }
    const data = await getMyProcessTasks({ status: statusMap[activeTab.value] })
    tasks.value = data
    loading.value = false
    finished.value = true
  } catch (error) {
    showNotify({ type: 'danger', message: error.message || '加载失败' })
    loading.value = false
    finished.value = true
  }
}

const onRefresh = async () => {
  finished.value = false
  await onLoad()
  refreshing.value = false
}

watch(activeTab, () => {
  tasks.value = []
  finished.value = false
  onLoad()
})
</script>

<style lang="scss" scoped>
.tasks-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.page-content {
  padding: 12px;
  padding-bottom: 60px;
}

.task-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:active {
    opacity: 0.8;
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.task-order-no {
  font-weight: 600;
  font-size: 14px;
  color: #323233;
}

.task-body {
  margin-bottom: 10px;
}

.process-info {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.process-name {
  font-size: 16px;
  font-weight: 600;
  color: #1989fa;
  margin-right: 8px;
}

.rework-badge {
  background: #ff976a;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.shoe-info {
  font-size: 13px;
  color: #646566;
  
  .divider {
    margin: 0 6px;
    color: #dcdee0;
  }
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #969799;
}

.customer-name {
  color: #646566;
}

.overdue-warning {
  color: #ee0a24;
  font-size: 11px;
  
  .van-icon {
    margin-right: 2px;
  }
}

.blocked-hint {
  margin-top: 8px;
  padding: 6px 10px;
  background: #fef0f0;
  color: #ee0a24;
  font-size: 12px;
  border-radius: 4px;
  
  .van-icon {
    margin-right: 4px;
  }
}
</style>
