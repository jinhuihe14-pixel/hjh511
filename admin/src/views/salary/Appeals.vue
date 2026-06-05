<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">申诉复核</h1>
      <div>
        <el-select v-model="filterStatus" placeholder="全部状态" style="width: 150px; margin-right: 10px;" clearable>
          <el-option label="待复核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <el-select v-model="selectedMonth" placeholder="选择月份" style="width: 150px; margin-right: 10px;" clearable>
          <el-option
            v-for="m in recentMonths"
            :key="m"
            :label="m"
            :value="m"
          />
        </el-select>
        <el-button type="primary" @click="loadAppeals">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <el-card shadow="hover">
      <el-table :data="appeals" border stripe v-loading="loading">
        <el-table-column prop="user.name" label="员工姓名" width="120" />
        <el-table-column prop="user.role" label="岗位" width="120">
          <template #default="{ row }">
            {{ getRoleName(row.user?.role) }}
          </template>
        </el-table-column>
        <el-table-column prop="detailSnapshot.orderNo" label="关联订单" width="150" />
        <el-table-column prop="detailSnapshot.type" label="明细类型" width="100">
          <template #default="{ row }">
            {{ getDetailType(row.detailSnapshot?.type) }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="180">
          <template #default="{ row }">
            <div>原：¥{{ row.detailSnapshot?.originalAmount }}</div>
            <div class="text-success">期：¥{{ row.expectedAmount }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="申诉理由" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salaryRecord.month" label="所属月份" width="120" />
        <el-table-column prop="createdAt" label="发起时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">
              详情
            </el-button>
            <template v-if="row.status === 'pending'">
              <el-button link type="success" @click="handleApprove(row)">
                通过
              </el-button>
              <el-button link type="danger" @click="handleReject(row)">
                驳回
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="申诉详情" width="600px">
      <div v-if="currentAppeal">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="员工姓名">{{ currentAppeal.user?.name }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ getRoleName(currentAppeal.user?.role) }}</el-descriptions-item>
          <el-descriptions-item label="所属月份">{{ currentAppeal.salaryRecord?.month }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentAppeal.status)">
              {{ getStatusName(currentAppeal.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联订单">{{ currentAppeal.detailSnapshot?.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="明细类型">{{ getDetailType(currentAppeal.detailSnapshot?.type) }}</el-descriptions-item>
          <el-descriptions-item label="原始金额">¥{{ currentAppeal.detailSnapshot?.originalAmount }}</el-descriptions-item>
          <el-descriptions-item label="期望金额" class="text-success">¥{{ currentAppeal.expectedAmount }}</el-descriptions-item>
          <el-descriptions-item label="差额" :span="2">
            <span :class="diffAmount >= 0 ? 'text-success' : 'text-danger'">
              {{ diffAmount >= 0 ? '+' : '' }}{{ diffAmount }} 元
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="申诉理由" :span="2">
            {{ currentAppeal.reason }}
          </el-descriptions-item>
          <el-descriptions-item label="发起时间" :span="2">
            {{ formatDate(currentAppeal.createdAt) }}
          </el-descriptions-item>
          <template v-if="currentAppeal.status !== 'pending'">
            <el-descriptions-item label="处理人">{{ currentAppeal.reviewedBy?.name }}</el-descriptions-item>
            <el-descriptions-item label="处理时间">{{ formatDate(currentAppeal.reviewedAt) }}</el-descriptions-item>
            <el-descriptions-item v-if="currentAppeal.status === 'rejected'" label="驳回说明" :span="2">
              {{ currentAppeal.rejectReason }}
            </el-descriptions-item>
          </template>
        </el-descriptions>

        <div class="detail-actions" v-if="currentAppeal.status === 'pending'">
          <el-button type="success" @click="handleApprove(currentAppeal)">
            通过申诉
          </el-button>
          <el-button type="danger" @click="handleReject(currentAppeal)">
            驳回申诉
          </el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="rejectDialogVisible" title="驳回申诉" width="400px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回说明" required>
          <el-input
            type="textarea"
            v-model="rejectForm.rejectReason"
            :rows="4"
            placeholder="请填写驳回说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject">确定驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getAppeals, approveAppeal as approveAppealApi, rejectAppeal as rejectAppealApi } from '@/api/salary'

const appeals = ref([])
const loading = ref(false)
const filterStatus = ref('')
const selectedMonth = ref('')
const detailDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const currentAppeal = ref(null)
const currentAppealId = ref('')

const rejectForm = reactive({
  rejectReason: ''
})

const recentMonths = computed(() => {
  const months = []
  for (let i = 0; i < 6; i++) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'))
  }
  return months
})

const diffAmount = computed(() => {
  if (!currentAppeal.value) return 0
  return currentAppeal.value.expectedAmount - currentAppeal.value.detailSnapshot?.originalAmount
})

const getRoleName = (role) => {
  const roleMap = {
    receptionist: '前台收鞋店员',
    technician: '洗护技工',
    repairer: '翻新师傅',
    admin: '店长'
  }
  return roleMap[role] || role
}

const getDetailType = (type) => {
  const typeMap = {
    commission: '接单提成',
    piece: '计件工资',
    repair: '维修提成'
  }
  return typeMap[type] || type
}

const getStatusName = (status) => {
  const statusMap = {
    pending: '待复核',
    approved: '已通过',
    rejected: '已驳回'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadAppeals = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (selectedMonth.value) params.month = selectedMonth.value
    appeals.value = await getAppeals(params)
  } catch (e) {
    ElMessage.error(e.message || '获取申诉列表失败')
  } finally {
    loading.value = false
  }
}

const viewDetail = (row) => {
  currentAppeal.value = row
  detailDialogVisible.value = true
}

const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定通过该申诉？将按差额 ${row.expectedAmount - row.detailSnapshot.originalAmount} 元调整薪资。`,
      '确认通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await approveAppealApi(row._id)
    ElMessage.success('申诉已通过')
    detailDialogVisible.value = false
    loadAppeals()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '操作失败')
    }
  }
}

const handleReject = (row) => {
  currentAppealId.value = row._id
  rejectForm.rejectReason = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectForm.rejectReason.trim()) {
    ElMessage.warning('请填写驳回说明')
    return
  }
  try {
    await rejectAppealApi(currentAppealId.value, { rejectReason: rejectForm.rejectReason })
    ElMessage.success('申诉已驳回')
    rejectDialogVisible.value = false
    detailDialogVisible.value = false
    loadAppeals()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

onMounted(() => {
  filterStatus.value = 'pending'
  loadAppeals()
})
</script>

<style lang="scss" scoped>
.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.detail-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}
</style>
