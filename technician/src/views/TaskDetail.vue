<template>
  <div class="task-detail-page">
    <van-nav-bar title="工序任务详情" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content" v-if="taskInfo">
      <van-cell-group inset>
        <van-cell title="订单号" :value="taskInfo.orderNo" />
        <van-cell title="取鞋码" :value="taskInfo.pickupCode" />
        <van-cell title="工序名称">
          <template #value>
            <van-tag type="primary" size="large">{{ taskInfo.processName }}</van-tag>
          </template>
        </van-cell>
        <van-cell title="工序状态">
          <template #value>
            <van-tag :type="getStatusType(taskInfo.processStatus)">
              {{ getStatusText(taskInfo.processStatus) }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="section-title">顾客信息</div>
      <van-cell-group inset>
        <van-cell title="姓名" :value="taskInfo.customer?.name" />
        <van-cell title="手机号" :value="taskInfo.customer?.phone" />
      </van-cell-group>

      <div class="section-title">鞋子信息</div>
      <van-cell-group inset>
        <van-cell title="品牌" :value="taskInfo.shoeInfo?.shoeBrand || '-'" />
        <van-cell title="类型" :value="taskInfo.shoeInfo?.shoeType || '-'" />
        <van-cell title="颜色" :value="taskInfo.shoeInfo?.shoeColor || '-'" />
        <van-cell title="服务项目">
          <template #value>
            <div>
              <van-tag
                v-for="service in taskInfo.shoeInfo?.services"
                :key="service.name"
                style="margin-right: 5px; margin-bottom: 5px;"
              >
                {{ service.name }}
              </van-tag>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="section-title">工序进度</div>
      <van-cell-group inset v-if="processTimeline.length > 0">
        <van-steps :active="currentStepIndex" direction="vertical">
          <van-step
            v-for="(step, index) in processTimeline"
            :key="step.key"
          >
            <h3>{{ step.name }}</h3>
            <p v-if="step.status === 'completed'">已完成 · {{ formatDate(step.completedAt) }}</p>
            <p v-else-if="step.status === 'in_progress'">进行中</p>
            <p v-else-if="step.status === 'rework'">返工中</p>
            <p v-else>待处理</p>
          </van-step>
        </van-steps>
      </van-cell-group>

      <div v-if="taskInfo.totalReworkCount > 0" class="section-title">
        <van-tag type="danger">返工记录 ({{ taskInfo.totalReworkCount }}次)</van-tag>
      </div>

      <div class="action-bar">
        <van-button
          v-if="canClaim"
          type="primary"
          block
          round
          :loading="claiming"
          @click="handleClaim"
        >
          领取工序
        </van-button>
        <van-button
          v-if="canStart"
          type="primary"
          block
          round
          :loading="starting"
          @click="handleStart"
        >
          开始处理
        </van-button>
        <van-button
          v-if="canComplete"
          type="success"
          block
          round
          :loading="completing"
          @click="handleComplete"
        >
          完成工序
        </van-button>
        <van-tag
          v-if="taskInfo.processStatus === 'completed'"
          type="success"
          size="large"
          class="completed-tag"
        >
          工序已完成
        </van-tag>
        <div v-if="isBlocked" class="blocked-tip">
          <van-icon name="info-o" />
          <span>前置工序未完成，无法开始此工序</span>
        </div>
        <div v-if="isClaimedByOther" class="blocked-tip">
          <van-icon name="info-o" />
          <span>该工序已被其他人领取</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showNotify, showDialog } from 'vant'
import { 
  getMyProcessTasks, 
  claimProcess, 
  startProcess, 
  completeProcess,
  getOrderById
} from '@/api/orders'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const taskInfo = ref(null)
const orderDetail = ref(null)
const claiming = ref(false)
const starting = ref(false)
const completing = ref(false)

const getStatusText = (status) => {
  const statusMap = {
    pending: '待领取',
    in_progress: '进行中',
    rework: '返工中',
    completed: '已完成'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    in_progress: 'primary',
    rework: 'danger',
    completed: 'success'
  }
  return typeMap[status] || 'default'
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('MM-DD HH:mm')
}

const processTimeline = computed(() => {
  if (!orderDetail.value?.shoes) return []
  const shoe = orderDetail.value.shoes[route.query.shoeIndex]
  if (!shoe?.processes) return []
  return shoe.processes.map(p => ({
    key: p.key,
    name: p.name,
    status: p.status,
    completedAt: p.completedAt
  }))
})

const currentStepIndex = computed(() => {
  if (!orderDetail.value?.shoes) return 0
  const shoe = orderDetail.value.shoes[route.query.shoeIndex]
  if (!shoe?.processes) return 0
  const idx = shoe.processes.findIndex(p => p.key === route.query.processKey)
  return Math.max(0, idx)
})

const canClaim = computed(() => {
  if (!taskInfo.value) return false
  const status = taskInfo.value.processStatus
  return (status === 'pending' || status === 'rework') && 
         taskInfo.value.canStart && 
         taskInfo.value.isUnclaimed
})

const canStart = computed(() => {
  if (!taskInfo.value) return false
  return taskInfo.value.processStatus === 'pending' && 
         taskInfo.value.isClaimedByMe
})

const canComplete = computed(() => {
  if (!taskInfo.value) return false
  return taskInfo.value.processStatus === 'in_progress' && 
         taskInfo.value.isClaimedByMe
})

const isBlocked = computed(() => {
  if (!taskInfo.value) return false
  return (taskInfo.value.processStatus === 'pending' || taskInfo.value.processStatus === 'rework') && 
         !taskInfo.value.canStart
})

const isClaimedByOther = computed(() => {
  if (!taskInfo.value) return false
  return (taskInfo.value.processStatus === 'pending' || taskInfo.value.processStatus === 'in_progress') && 
         !taskInfo.value.isClaimedByMe && 
         !taskInfo.value.isUnclaimed
})

const loadTaskInfo = async () => {
  try {
    const { orderId, shoeIndex, processKey } = route.query
    const tasks = await getMyProcessTasks()
    const task = tasks.find(
      t => t.orderId === orderId && 
           t.shoeIndex == shoeIndex && 
           t.processKey === processKey
    )
    taskInfo.value = task

    const order = await getOrderById(orderId)
    orderDetail.value = order
  } catch (error) {
    showNotify({ type: 'danger', message: error.message || '加载失败' })
  }
}

const handleClaim = async () => {
  try {
    await showDialog({
      title: '确认领取',
      message: '确定领取此工序任务？'
    })
    
    claiming.value = true
    const { orderId, shoeIndex, processKey } = route.query
    await claimProcess(orderId, shoeIndex, processKey)
    showNotify({ type: 'success', message: '领取成功' })
    await loadTaskInfo()
  } catch (error) {
    if (error.message !== 'cancel') {
      showNotify({ type: 'danger', message: error.message || '领取失败' })
    }
  } finally {
    claiming.value = false
  }
}

const handleStart = async () => {
  try {
    await showDialog({
      title: '确认开始',
      message: '确定开始处理此工序？'
    })
    
    starting.value = true
    const { orderId, shoeIndex, processKey } = route.query
    await startProcess(orderId, shoeIndex, processKey)
    showNotify({ type: 'success', message: '已开始处理' })
    await loadTaskInfo()
  } catch (error) {
    if (error.message !== 'cancel') {
      showNotify({ type: 'danger', message: error.message || '开始失败' })
    }
  } finally {
    starting.value = false
  }
}

const handleComplete = async () => {
  try {
    await showDialog({
      title: '确认完成',
      message: '确定已完成此工序？'
    })
    
    completing.value = true
    const { orderId, shoeIndex, processKey } = route.query
    const result = await completeProcess(orderId, shoeIndex, processKey)
    showNotify({ type: 'success', message: '工序已完成' })
    
    if (result.orderStatus === 'completed') {
      setTimeout(() => {
        showNotify({ type: 'success', message: '整单已完成！' })
      }, 500)
    }
    
    await loadTaskInfo()
  } catch (error) {
    if (error.message !== 'cancel') {
      showNotify({ type: 'danger', message: error.message || '完成失败' })
    }
  } finally {
    completing.value = false
  }
}

onMounted(() => {
  loadTaskInfo()
})
</script>

<style lang="scss" scoped>
.task-detail-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 120px;
}

.page-content {
  padding: 12px 0;
}

.section-title {
  padding: 16px 16px 8px;
  font-size: 14px;
  color: #646566;
  font-weight: 500;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.completed-tag {
  display: block;
  text-align: center;
  padding: 10px;
}

.blocked-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: #fef0f0;
  color: #ee0a24;
  font-size: 13px;
  border-radius: 4px;
  
  .van-icon {
    margin-right: 6px;
  }
}

:deep(.van-steps--vertical) {
  padding: 10px 16px;
}
</style>
