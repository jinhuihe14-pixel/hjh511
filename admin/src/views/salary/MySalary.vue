<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">我的薪资</h1>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card shadow="hover" header="当前月份薪资">
          <div class="salary-summary">
            <div class="summary-item">
              <p class="label">底薪</p>
              <p class="value">¥{{ mySalary.baseSalary || 0 }}</p>
            </div>
            <div class="summary-item" v-if="mySalary.commission">
              <p class="label">接单提成</p>
              <p class="value">¥{{ mySalary.commission || 0 }}</p>
            </div>
            <div class="summary-item" v-if="mySalary.pieceWork">
              <p class="label">计件工资</p>
              <p class="value">¥{{ mySalary.pieceWork || 0 }}</p>
            </div>
            <div class="summary-item" v-if="mySalary.repairCommission">
              <p class="label">维修提成</p>
              <p class="value">¥{{ mySalary.repairCommission || 0 }}</p>
            </div>
            <div class="summary-item">
              <p class="label">全勤奖</p>
              <p class="value">¥{{ mySalary.fullAttendanceBonus || 0 }}</p>
            </div>
            <div class="summary-item total">
              <p class="label">预估工资</p>
              <p class="value">¥{{ mySalary.totalSalary || 0 }}</p>
            </div>
          </div>

          <el-divider />

          <div class="stats-row">
            <div class="stat-box">
              <p class="stat-label">本月接单</p>
              <p class="stat-value">{{ mySalary.orderCount || 0 }} 单</p>
            </div>
            <div class="stat-box">
              <p class="stat-label">本月计件</p>
              <p class="stat-value">{{ mySalary.pieceCount || 0 }} 双</p>
            </div>
            <div class="stat-box">
              <p class="stat-label">状态</p>
              <p class="stat-value">
                <el-tag :type="mySalary.isLocked ? 'success' : 'warning'">
                  {{ mySalary.isLocked ? '已锁定' : '核算中' }}
                </el-tag>
              </p>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" header="提成明细" class="mt-20" v-if="mySalary.details?.length">
          <el-table :data="mySalary.details" border stripe>
            <el-table-column prop="orderNo" label="订单号" width="150" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">{{ getDetailType(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" header="历史薪资">
          <el-timeline>
            <el-timeline-item
              v-for="record in historyRecords"
              :key="record.month"
              :timestamp="record.month"
              placement="top"
            >
              <el-card size="small">
                <p>实发工资：<span class="salary-amount">¥{{ record.totalSalary }}</span></p>
                <el-tag size="small" :type="record.isLocked ? 'success' : 'warning'">
                  {{ record.isLocked ? '已发放' : '待确认' }}
                </el-tag>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMySalary, getSalaryRecords } from '@/api/salary'

const mySalary = ref({})
const historyRecords = ref([])

const getDetailType = (type) => {
  const typeMap = {
    commission: '接单提成',
    piece: '计件工资',
    repair: '维修提成'
  }
  return typeMap[type] || type
}

const loadData = async () => {
  mySalary.value = await getMySalary()
  historyRecords.value = await getSalaryRecords()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.salary-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  
  .summary-item {
    min-width: 120px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 8px;
    text-align: center;
    
    &.total {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      
      .value {
        color: #fff;
        font-size: 28px;
      }
    }
    
    .label {
      color: #909399;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .value {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.stats-row {
  display: flex;
  justify-content: space-around;
  
  .stat-box {
    text-align: center;
    
    .stat-label {
      color: #909399;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.salary-amount {
  color: #f56c6c;
  font-weight: 600;
  font-size: 18px;
}
</style>
