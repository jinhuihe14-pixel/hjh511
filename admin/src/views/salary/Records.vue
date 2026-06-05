<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">薪资核算</h1>
      <div>
        <el-select v-model="selectedMonth" placeholder="选择月份" style="width: 150px; margin-right: 10px;">
          <el-option
            v-for="m in recentMonths"
            :key="m"
            :label="m"
            :value="m"
          />
        </el-select>
        <el-button type="primary" @click="calculateSalary">
          <el-icon><Refresh /></el-icon>
          计算薪资
        </el-button>
      </div>
    </div>

    <el-card shadow="hover">
      <el-table :data="salaryRecords" border stripe>
        <el-table-column prop="user.name" label="员工姓名" width="120" />
        <el-table-column prop="user.role" label="岗位" width="120">
          <template #default="{ row }">
            {{ getRoleName(row.user?.role) }}
          </template>
        </el-table-column>
        <el-table-column prop="baseSalary" label="底薪" width="100" />
        <el-table-column prop="commission" label="接单提成" width="100" v-if="hasReceptionist" />
        <el-table-column prop="pieceWork" label="计件工资" width="100" v-if="hasTechnician" />
        <el-table-column prop="repairCommission" label="维修提成" width="100" v-if="hasRepairer" />
        <el-table-column prop="orderCount" label="订单数" width="80" />
        <el-table-column prop="pieceCount" label="计件数" width="80" />
        <el-table-column prop="fullAttendanceBonus" label="全勤奖" width="80" />
        <el-table-column prop="totalSalary" label="实发工资" width="120">
          <template #default="{ row }">
            <span class="total-salary">¥{{ row.totalSalary }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="isLocked" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isLocked ? 'success' : 'warning'">
              {{ row.isLocked ? '已锁定' : '待确认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row._id)">
              详情
            </el-button>
            <el-button link type="warning" @click="openAdjustment(row)" v-if="!row.isLocked">
              调整
            </el-button>
            <el-button link type="success" @click="lockSalary(row)" v-if="!row.isLocked">
              锁定
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="薪资详情" width="700px">
      <div v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="员工姓名">{{ currentRecord.user?.name }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ getRoleName(currentRecord.user?.role) }}</el-descriptions-item>
          <el-descriptions-item label="月份">{{ currentRecord.month }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentRecord.isLocked ? 'success' : 'warning'">
              {{ currentRecord.isLocked ? '已锁定' : '待确认' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="底薪">¥{{ currentRecord.baseSalary }}</el-descriptions-item>
          <el-descriptions-item label="接单提成">¥{{ currentRecord.commission }}</el-descriptions-item>
          <el-descriptions-item label="计件工资">¥{{ currentRecord.pieceWork }}</el-descriptions-item>
          <el-descriptions-item label="维修提成">¥{{ currentRecord.repairCommission }}</el-descriptions-item>
          <el-descriptions-item label="全勤奖">¥{{ currentRecord.fullAttendanceBonus }}</el-descriptions-item>
          <el-descriptions-item label="其他奖金">¥{{ currentRecord.otherBonuses }}</el-descriptions-item>
          <el-descriptions-item label="迟到扣款">¥{{ currentRecord.lateDeduction }}</el-descriptions-item>
          <el-descriptions-item label="其他扣款">¥{{ currentRecord.otherDeductions }}</el-descriptions-item>
          <el-descriptions-item label="实发工资" :span="2">
            <span class="detail-total">¥{{ currentRecord.totalSalary }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 20px 0 10px;">提成明细</h4>
        <el-table :data="currentRecord.details" size="small" border>
          <el-table-column prop="orderNo" label="订单号" width="150" />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              {{ getDetailType(row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" />
          <el-table-column prop="amount" label="金额" width="100" />
        </el-table>

        <h4 style="margin: 20px 0 10px;" v-if="currentRecord.manualAdjustments?.length">手动调整记录</h4>
        <el-table :data="currentRecord.manualAdjustments" size="small" border v-if="currentRecord.manualAdjustments?.length">
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'bonus' ? 'success' : 'danger'">
                {{ row.type === 'bonus' ? '奖金' : '扣款' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="100" />
          <el-table-column prop="reason" label="原因" />
          <el-table-column prop="createdAt" label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="adjustmentDialogVisible" title="薪资调整" width="400px">
      <el-form :model="adjustmentForm" label-width="80px">
        <el-form-item label="调整类型">
          <el-radio-group v-model="adjustmentForm.type">
            <el-radio value="bonus">奖金</el-radio>
            <el-radio value="deduction">扣款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="adjustmentForm.amount" :min="0" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input type="textarea" v-model="adjustmentForm.reason" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjustment">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getSalaryRecords, calculateSalary as calcSalary, getSalaryRecordById, addSalaryAdjustment, lockSalary as lockSalaryApi } from '@/api/salary'

const salaryRecords = ref([])
const selectedMonth = ref(dayjs().format('YYYY-MM'))
const detailDialogVisible = ref(false)
const adjustmentDialogVisible = ref(false)
const currentRecordId = ref('')
const currentRecord = ref(null)

const adjustmentForm = reactive({
  type: 'bonus',
  amount: 0,
  reason: ''
})

const recentMonths = computed(() => {
  const months = []
  for (let i = 0; i < 6; i++) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'))
  }
  return months
})

const hasReceptionist = computed(() => salaryRecords.value.some(r => r.user?.role === 'receptionist'))
const hasTechnician = computed(() => salaryRecords.value.some(r => r.user?.role === 'technician'))
const hasRepairer = computed(() => salaryRecords.value.some(r => r.user?.role === 'repairer'))

const getRoleName = (role) => {
  const roleMap = {
    receptionist: '前台收鞋店员',
    technician: '洗护技工',
    repairer: '翻新师傅'
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

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadRecords = async () => {
  salaryRecords.value = await getSalaryRecords({ month: selectedMonth.value })
}

const calculateSalary = async () => {
  await ElMessageBox.confirm('确定重新计算本月薪资？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  await calcSalary(selectedMonth.value)
  ElMessage.success('薪资计算完成')
  loadRecords()
}

const viewDetail = async (id) => {
  currentRecord.value = await getSalaryRecordById(id)
  detailDialogVisible.value = true
}

const openAdjustment = (row) => {
  currentRecordId.value = row._id
  adjustmentForm.type = 'bonus'
  adjustmentForm.amount = 0
  adjustmentForm.reason = ''
  adjustmentDialogVisible.value = true
}

const confirmAdjustment = async () => {
  await addSalaryAdjustment(currentRecordId.value, adjustmentForm)
  ElMessage.success('调整成功')
  adjustmentDialogVisible.value = false
  loadRecords()
}

const lockSalary = async (row) => {
  await ElMessageBox.confirm('锁定后薪资将无法修改，确定锁定？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  await lockSalaryApi(row._id)
  ElMessage.success('薪资已锁定')
  loadRecords()
}

onMounted(() => {
  loadRecords()
})
</script>

<style lang="scss" scoped>
.total-salary {
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.detail-total {
  font-size: 20px;
  font-weight: 600;
  color: #f56c6c;
}
</style>
