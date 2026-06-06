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
        <el-descriptions-item label="预计取鞋">
          <span :class="{ 'text-danger': isOverdue }">
            {{ order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '-' }}
          </span>
        </el-descriptions-item>
      </el-descriptions>

      <h3 class="mb-10">洗护鞋子</h3>
      <div v-for="(shoe, index) in order.shoes" :key="index" class="shoe-item">
        <el-divider>
          <span style="font-weight: 600;">鞋子 {{ index + 1 }}</span>
          <el-tag v-if="shoe.totalReworkCount > 0" type="danger" size="small" class="ml-10">
            返工{{ shoe.totalReworkCount }}次
          </el-tag>
        </el-divider>
        
        <el-descriptions :column="2" size="small" class="mb-10">
          <el-descriptions-item label="鞋款类型">{{ shoe.shoeType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ shoe.shoeBrand || '-' }}</el-descriptions-item>
          <el-descriptions-item label="颜色">{{ shoe.shoeColor || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getShoeStatusType(shoe.overallStatus)">
              {{ getShoeStatusText(shoe.overallStatus) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="services mt-10 mb-15">
          <h4>洗护项目</h4>
          <el-tag
            v-for="service in shoe.services"
            :key="service.name"
            style="margin-right: 10px; margin-bottom: 10px;"
          >
            {{ service.name }} - ¥{{ service.price }}
          </el-tag>
        </div>

        <div class="process-section">
          <h4>工序进度</h4>
          <el-steps :active="getCurrentStepIndex(shoe)" finish-status="success" align-center class="mb-15">
            <el-step
              v-for="proc in shoe.processes"
              :key="proc.key"
              :title="proc.name"
              :status="getStepStatus(proc.status)"
            />
          </el-steps>

          <el-table :data="shoe.processes" size="small" border>
            <el-table-column prop="sortOrder" label="序号" width="60" align="center" />
            <el-table-column prop="name" label="工序名称" width="120" />
            <el-table-column prop="role" label="负责角色" width="100">
              <template #default="{ row }">
                {{ getRoleText(row.role) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getProcessStatusType(row.status)" size="small">
                  {{ getProcessStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="负责人" width="100">
              <template #default="{ row }">
                {{ row.assignee?.name || row.claimedBy?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="开始时间" width="160">
              <template #default="{ row }">
                {{ row.startedAt ? formatDate(row.startedAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="完成时间" width="160">
              <template #default="{ row }">
                {{ row.completedAt ? formatDate(row.completedAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="耗时(分)" width="80" align="center">
              <template #default="{ row }">
                {{ row.duration || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="返工次数" width="80" align="center">
              <template #default="{ row }">
                <span v-if="row.reworkCount > 0" class="text-danger">
                  {{ row.reworkCount }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="canDoQualityCheck(shoe)" class="qc-actions mt-15">
            <el-button type="success" @click="openQcDialog(index)">
              质检操作
            </el-button>
            <el-button type="warning" @click="openReworkDialog(index)">
              直接打回返工
            </el-button>
          </div>

          <div v-if="shoe.totalReworkCount > 0" class="rework-history mt-15">
            <h4>返工记录</h4>
            <el-table
              :data="getReworkRecords(shoe)"
              size="small"
              border
            >
              <el-table-column prop="reworkCount" label="第几次" width="80" align="center" />
              <el-table-column prop="fromProcessName" label="责任工序" width="120" />
              <el-table-column prop="responsibleUserName" label="责任人" width="100" />
              <el-table-column prop="reason" label="返工原因" />
              <el-table-column prop="createdAt" label="时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
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

    <el-dialog v-model="qcDialogVisible" title="质检操作" width="500px">
      <el-form :model="qcForm" label-width="100px">
        <el-form-item label="质检结果">
          <el-radio-group v-model="qcForm.passed">
            <el-radio :value="true">质检通过</el-radio>
            <el-radio :value="false">质检不通过</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <template v-if="!qcForm.passed">
          <el-form-item label="打回工序">
            <el-select v-model="qcForm.reworkToProcessKey" placeholder="请选择打回到哪个工序">
              <el-option
                v-for="proc in getAvailableReworkProcesses()"
                :key="proc.key"
                :label="proc.name"
                :value="proc.key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="责任工序">
            <el-select v-model="qcForm.responsibleProcessKey" placeholder="请选择责任工序">
              <el-option
                v-for="proc in getAvailableReworkProcesses()"
                :key="proc.key"
                :label="proc.name"
                :value="proc.key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="返工原因">
            <el-input
              v-model="qcForm.reworkReason"
              type="textarea"
              :rows="3"
              placeholder="请输入返工原因"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="qcDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQc" :loading="qcSubmitting">
          确认
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reworkDialogVisible" title="打回返工" width="500px">
      <el-form :model="reworkForm" label-width="100px">
        <el-form-item label="打回工序">
          <el-select v-model="reworkForm.reworkToProcessKey" placeholder="请选择打回到哪个工序">
            <el-option
              v-for="proc in getAvailableReworkProcesses()"
              :key="proc.key"
              :label="proc.name"
              :value="proc.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="责任工序">
          <el-select v-model="reworkForm.responsibleProcessKey" placeholder="请选择责任工序">
            <el-option
              v-for="proc in getAvailableReworkProcesses()"
              :key="proc.key"
              :label="proc.name"
              :value="proc.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="返工原因">
          <el-input
            v-model="reworkForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入返工原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reworkDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="submitRework" :loading="reworkSubmitting">
          确认打回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { 
  getOrderById, 
  doQualityCheck, 
  reworkShoe 
} from '@/api/orders'
import { useUserStore } from '@/store/user'

const route = useRoute()
const userStore = useUserStore()
const order = ref(null)

const qcDialogVisible = ref(false)
const qcSubmitting = ref(false)
const currentShoeIndex = ref(0)
const qcForm = ref({
  passed: true,
  reworkToProcessKey: '',
  responsibleProcessKey: '',
  reworkReason: ''
})

const reworkDialogVisible = ref(false)
const reworkSubmitting = ref(false)
const reworkForm = ref({
  reworkToProcessKey: '',
  responsibleProcessKey: '',
  reason: ''
})

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

const isOverdue = computed(() => {
  if (!order.value?.estimatedDelivery) return false
  return new Date(order.value.estimatedDelivery) < new Date() && 
         order.value.status !== 'completed' && 
         order.value.status !== 'picked_up'
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

const getShoeStatusText = (status) => {
  const statusMap = {
    pending: '待开始',
    processing: '进行中',
    rework: '返工中',
    completed: '已完成'
  }
  return statusMap[status] || status
}

const getShoeStatusType = (status) => {
  const typeMap = {
    pending: 'info',
    processing: 'primary',
    rework: 'danger',
    completed: 'success'
  }
  return typeMap[status] || 'info'
}

const getProcessStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    in_progress: '进行中',
    rework: '返工中',
    completed: '已完成'
  }
  return statusMap[status] || status
}

const getProcessStatusType = (status) => {
  const typeMap = {
    pending: 'info',
    in_progress: 'primary',
    rework: 'danger',
    completed: 'success'
  }
  return typeMap[status] || 'info'
}

const getStepStatus = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'process'
  if (status === 'rework') return 'error'
  return 'wait'
}

const getRoleText = (role) => {
  const roleMap = {
    receptionist: '前台',
    technician: '技工',
    repairer: '翻新师',
    inspector: '质检'
  }
  return roleMap[role] || role
}

const getCurrentStepIndex = (shoe) => {
  if (!shoe.processes) return 0
  const idx = shoe.processes.findIndex(p => p.status !== 'completed')
  return idx === -1 ? shoe.processes.length : idx
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const canDoQualityCheck = (shoe) => {
  if (!shoe.processes) return false
  const userRole = userStore.user?.role
  if (userRole !== 'admin' && userRole !== 'inspector') return false
  
  const qcProc = shoe.processes.find(p => p.key === 'quality_check')
  if (!qcProc) return false
  
  return qcProc.status === 'in_progress' || 
         qcProc.status === 'pending' ||
         (qcProc.status === 'completed' && userRole === 'admin')
}

const getAvailableReworkProcesses = () => {
  if (!order.value?.shoes) return []
  const shoe = order.value.shoes[currentShoeIndex.value]
  if (!shoe?.processes) return []
  
  const qcIndex = shoe.processes.findIndex(p => p.key === 'quality_check')
  if (qcIndex === -1) return shoe.processes
  
  return shoe.processes.slice(0, qcIndex).filter(p => p.status === 'completed')
}

const getReworkRecords = (shoe) => {
  const records = []
  shoe.processes.forEach(proc => {
    if (proc.reworkHistory && proc.reworkHistory.length > 0) {
      records.push(...proc.reworkHistory)
    }
  })
  return records.sort((a, b) => b.reworkCount - a.reworkCount)
}

const openQcDialog = (shoeIndex) => {
  currentShoeIndex.value = shoeIndex
  qcForm.value = {
    passed: true,
    reworkToProcessKey: '',
    responsibleProcessKey: '',
    reworkReason: ''
  }
  qcDialogVisible.value = true
}

const openReworkDialog = (shoeIndex) => {
  currentShoeIndex.value = shoeIndex
  reworkForm.value = {
    reworkToProcessKey: '',
    responsibleProcessKey: '',
    reason: ''
  }
  reworkDialogVisible.value = true
}

const submitQc = async () => {
  try {
    if (!qcForm.value.passed) {
      if (!qcForm.value.reworkToProcessKey || !qcForm.value.reworkReason) {
        ElMessage.warning('请填写打回工序和原因')
        return
      }
    }

    qcSubmitting.value = true
    const shoe = order.value.shoes[currentShoeIndex.value]
    const qcProc = shoe.processes.find(p => p.key === 'quality_check')
    
    if (!qcProc) {
      ElMessage.error('质检工序不存在')
      return
    }

    await doQualityCheck(
      route.params.id,
      currentShoeIndex.value,
      qcProc.key,
      {
        passed: qcForm.value.passed,
        reworkToProcessKey: qcForm.value.reworkToProcessKey,
        reworkReason: qcForm.value.reworkReason,
        responsibleProcessKey: qcForm.value.responsibleProcessKey
      }
    )

    ElMessage.success(qcForm.value.passed ? '质检通过' : '已打回返工')
    qcDialogVisible.value = false
    await loadOrder()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    qcSubmitting.value = false
  }
}

const submitRework = async () => {
  try {
    if (!reworkForm.value.reworkToProcessKey || !reworkForm.value.reason) {
      ElMessage.warning('请填写打回工序和原因')
      return
    }

    reworkSubmitting.value = true

    await reworkShoe(
      route.params.id,
      currentShoeIndex.value,
      {
        reworkToProcessKey: reworkForm.value.reworkToProcessKey,
        reason: reworkForm.value.reason,
        responsibleProcessKey: reworkForm.value.responsibleProcessKey
      }
    )

    ElMessage.success('已打回返工')
    reworkDialogVisible.value = false
    await loadOrder()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    reworkSubmitting.value = false
  }
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

.process-section {
  margin-top: 15px;
  
  h4 {
    margin-bottom: 10px;
    font-size: 14px;
    color: #303133;
  }
}

.qc-actions {
  display: flex;
  gap: 10px;
}

.rework-history {
  h4 {
    margin-bottom: 10px;
    font-size: 14px;
    color: #f56c6c;
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

.mb-10 {
  margin-bottom: 10px;
}

.mb-15 {
  margin-bottom: 15px;
}

.mb-20 {
  margin-bottom: 20px;
}

.mt-10 {
  margin-top: 10px;
}

.mt-15 {
  margin-top: 15px;
}

.ml-10 {
  margin-left: 10px;
}

.text-danger {
  color: #f56c6c;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
