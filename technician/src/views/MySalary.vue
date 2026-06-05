<template>
  <div class="my-salary-page">
    <van-nav-bar title="我的薪资" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content" v-if="salary">
      <div class="salary-card">
        <div class="salary-total">
          <div class="total-label">本月预估工资</div>
          <div class="total-amount">¥{{ salary.totalSalary || 0 }}</div>
        </div>
        <div class="salary-status">
          <van-tag :type="salary.isLocked ? 'success' : 'warning'">
            {{ salary.isLocked ? '已锁定' : '核算中' }}
          </van-tag>
        </div>
      </div>

      <van-cell-group inset>
        <van-cell title="底薪" :value="'¥' + (salary.baseSalary || 0)" />
        <van-cell title="计件工资" :value="'¥' + (salary.pieceWork || 0)" />
        <van-cell title="计件数量" :value="(salary.pieceCount || 0) + ' 双'" />
        <van-cell title="维修提成" :value="'¥' + (salary.repairCommission || 0)" />
        <van-cell title="全勤奖" :value="'¥' + (salary.fullAttendanceBonus || 0)" />
        <van-cell title="其他奖金" :value="'¥' + (salary.otherBonuses || 0)" />
        <van-cell title="扣款" :value="'¥' + (salary.otherDeductions || 0)" />
      </van-cell-group>

      <van-tabs v-model:active="activeTab" class="salary-tabs">
        <van-tab title="薪资明细" name="details">
          <van-cell-group inset class="detail-group">
            <van-cell
              v-for="item in salary.details"
              :key="item._id"
              :title="item.description"
              :label="item.orderNo"
              :value="'¥' + item.amount"
              is-link
              @click="showDetailAction(item)"
            >
              <template #right-icon>
                <div class="detail-right">
                  <van-tag v-if="item.appealStatus" size="medium" :type="getAppealTagType(item.appealStatus)">
                    {{ getAppealStatusName(item.appealStatus) }}
                  </van-tag>
                  <van-icon name="arrow" />
                </div>
              </template>
            </van-cell>
            <div v-if="!salary.details || salary.details.length === 0" class="empty-tip">
              <van-empty description="暂无明细数据" />
            </div>
          </van-cell-group>
        </van-tab>

        <van-tab title="申诉记录" name="appeals">
          <van-cell-group inset class="detail-group">
            <van-cell
              v-for="appeal in myAppeals"
              :key="appeal._id"
              :title="appeal.detailSnapshot?.description || '薪资申诉'"
              :label="formatDate(appeal.createdAt)"
              is-link
              @click="viewAppealDetail(appeal)"
            >
              <template #right-icon>
                <div class="detail-right">
                  <van-tag size="medium" :type="getAppealTagType(appeal.status)">
                    {{ getAppealStatusName(appeal.status) }}
                  </van-tag>
                  <van-icon name="arrow" />
                </div>
              </template>
            </van-cell>
            <div v-if="!myAppeals || myAppeals.length === 0" class="empty-tip">
              <van-empty description="暂无申诉记录" />
            </div>
          </van-cell-group>
        </van-tab>
      </van-tabs>
    </div>

    <div v-else class="empty-tip">
      <van-empty description="暂无薪资数据" />
    </div>

    <van-action-sheet v-model:show="actionSheetVisible" :actions="actionSheetActions" cancel-text="取消" @select="onActionSelect" />

    <van-dialog v-model:show="appealDialogVisible" title="发起申诉" show-cancel-button @confirm="submitAppeal">
      <div class="appeal-form">
        <van-cell-group inset>
          <van-cell title="订单号" :value="selectedDetail?.orderNo" />
          <van-cell title="原始金额" :value="'¥' + (selectedDetail?.amount || 0)" />
          <van-field
            v-model="appealForm.expectedAmount"
            type="number"
            label="期望金额"
            placeholder="请输入期望金额"
            required
          />
          <van-field
            v-model="appealForm.reason"
            type="textarea"
            label="申诉理由"
            placeholder="请输入申诉理由"
            rows="3"
            autosize
            required
          />
        </van-cell-group>
      </div>
    </van-dialog>

    <van-popup v-model:show="appealDetailVisible" position="bottom" :style="{ height: '70%' }" round>
      <div class="appeal-detail-popup">
        <div class="popup-header">
          <h3>申诉详情</h3>
          <van-icon name="close" @click="appealDetailVisible = false" />
        </div>
        <div class="popup-content" v-if="currentAppeal">
          <van-cell-group inset>
            <van-cell title="状态">
              <template #value>
                <van-tag :type="getAppealTagType(currentAppeal.status)">
                  {{ getAppealStatusName(currentAppeal.status) }}
                </van-tag>
              </template>
            </van-cell>
            <van-cell title="所属月份" :value="currentAppeal.salaryRecord?.month" />
            <van-cell title="关联订单" :value="currentAppeal.detailSnapshot?.orderNo" />
            <van-cell title="原始金额" :value="'¥' + (currentAppeal.detailSnapshot?.originalAmount || 0)" />
            <van-cell title="期望金额" :value="'¥' + (currentAppeal.expectedAmount || 0)" />
            <van-cell title="申诉理由" :value="currentAppeal.reason" />
            <van-cell title="发起时间" :value="formatDate(currentAppeal.createdAt)" />
            <template v-if="currentAppeal.status !== 'pending'">
              <van-cell title="处理人" :value="currentAppeal.reviewedBy?.name" />
              <van-cell title="处理时间" :value="formatDate(currentAppeal.reviewedAt)" />
              <van-cell v-if="currentAppeal.status === 'rejected'" title="驳回说明" :value="currentAppeal.rejectReason" />
            </template>
          </van-cell-group>

          <div class="reappeal-btn" v-if="currentAppeal.status === 'rejected' && !salary.isLocked">
            <van-button type="primary" block @click="reAppeal">重新申诉</van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import dayjs from 'dayjs'
import { getMySalary, createAppeal, getMyAppeals, getAppealById } from '@/api/salary'

const salary = ref(null)
const myAppeals = ref([])
const activeTab = ref('details')
const actionSheetVisible = ref(false)
const appealDialogVisible = ref(false)
const appealDetailVisible = ref(false)
const selectedDetail = ref(null)
const currentAppeal = ref(null)

const appealForm = reactive({
  expectedAmount: '',
  reason: ''
})

const actionSheetActions = computed(() => {
  const actions = []
  if (selectedDetail.value) {
    const status = selectedDetail.value.appealStatus
    if (!status) {
      actions.push({ name: '发起申诉', value: 'appeal' })
    } else if (status === 'pending') {
      actions.push({ name: '查看申诉', value: 'view' })
    } else if (status === 'approved') {
      actions.push({ name: '查看申诉', value: 'view' })
    } else if (status === 'rejected') {
      actions.push({ name: '查看申诉', value: 'view' })
      if (!salary.value?.isLocked) {
        actions.push({ name: '重新申诉', value: 'reappeal' })
      }
    }
  }
  return actions
})

const getAppealStatusName = (status) => {
  const statusMap = {
    pending: '待复核',
    approved: '已通过',
    rejected: '已驳回'
  }
  return statusMap[status] || status
}

const getAppealTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'default'
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadData = async () => {
  try {
    salary.value = await getMySalary()
    await loadMyAppeals()
  } catch (e) {
    salary.value = null
  }
}

const loadMyAppeals = async () => {
  try {
    myAppeals.value = await getMyAppeals()
  } catch (e) {
    myAppeals.value = []
  }
}

const showDetailAction = (item) => {
  selectedDetail.value = item
  if (salary.value?.isLocked && !item.appealStatus) {
    showToast('薪资已锁定，无法发起申诉')
    return
  }
  actionSheetVisible.value = true
}

const onActionSelect = (action) => {
  if (action.value === 'appeal' || action.value === 'reappeal') {
    openAppealDialog()
  } else if (action.value === 'view') {
    viewAppealByDetail()
  }
}

const openAppealDialog = () => {
  appealForm.expectedAmount = selectedDetail.value?.amount?.toString() || ''
  appealForm.reason = ''
  appealDialogVisible.value = true
}

const submitAppeal = async () => {
  if (!appealForm.expectedAmount) {
    showToast('请输入期望金额')
    return
  }
  if (!appealForm.reason.trim()) {
    showToast('请输入申诉理由')
    return
  }

  try {
    await showConfirmDialog({
      title: '确认提交',
      message: '确定提交该申诉吗？'
    })

    await createAppeal({
      salaryRecordId: salary.value._id,
      detailId: selectedDetail.value._id,
      expectedAmount: parseFloat(appealForm.expectedAmount),
      reason: appealForm.reason
    })

    showToast('申诉提交成功')
    appealDialogVisible.value = false
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      showToast(e.message || '提交失败')
    }
  }
}

const viewAppealByDetail = async () => {
  if (selectedDetail.value?.appealId) {
    const appeal = await getAppealById(selectedDetail.value.appealId)
    currentAppeal.value = appeal
    appealDetailVisible.value = true
  }
}

const viewAppealDetail = async (appeal) => {
  const detail = await getAppealById(appeal._id)
  currentAppeal.value = detail
  appealDetailVisible.value = true
}

const reAppeal = () => {
  const detail = salary.value?.details?.find(d => d._id === currentAppeal.value?.detailId)
  if (detail) {
    selectedDetail.value = detail
    appealDetailVisible.value = false
    openAppealDialog()
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.salary-card {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  margin: 16px;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  color: #fff;
  position: relative;
}

.salary-total {
  .total-label {
    font-size: 14px;
    opacity: 0.9;
    margin-bottom: 10px;
  }
  
  .total-amount {
    font-size: 36px;
    font-weight: bold;
  }
}

.salary-status {
  position: absolute;
  top: 16px;
  right: 16px;
}

.section-title {
  padding: 16px;
  color: #646566;
  font-size: 14px;
}

.empty-tip {
  padding: 40px 0;
}

.salary-tabs {
  margin-top: 16px;
}

.detail-group {
  margin-top: 0 !important;
}

.detail-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #969799;
}

.appeal-form {
  padding: 16px 0;
}

.appeal-detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
  
  h3 {
    margin: 0;
    font-size: 16px;
  }
  
  .van-icon {
    font-size: 20px;
    color: #969799;
  }
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.reappeal-btn {
  padding: 16px;
}
</style>
