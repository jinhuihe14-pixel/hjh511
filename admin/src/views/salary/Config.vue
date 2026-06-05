<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">薪资配置</h1>
      <el-button type="primary" @click="showConfigDialog">
        <el-icon><Plus /></el-icon>
        修改配置（次月生效）
      </el-button>
    </div>

    <el-row :gutter="20">
      <el-col :span="8" v-for="config in configs" :key="config.role">
        <el-card shadow="hover" :class="['config-card', config.role]">
          <template #header>
            <div class="card-header">
              <span>{{ getRoleName(config.role) }}</span>
              <el-tag type="success">生效中</el-tag>
            </div>
          </template>
          <div class="config-item">
            <span class="label">底薪</span>
            <span class="value">¥{{ config.baseSalary }}</span>
          </div>
          <div class="config-item" v-if="config.role === 'receptionist'">
            <span class="label">接单提成比例</span>
            <span class="value">{{ config.commissionRate }}%</span>
          </div>
          <div class="config-item" v-if="config.role === 'technician'">
            <span class="label">洗护计件单价</span>
            <span class="value">¥{{ config.pieceRate }}/双</span>
          </div>
          <div class="config-item" v-if="config.role === 'repairer'">
            <span class="label">维修项目提成</span>
            <span class="value">{{ config.commissionRate }}%</span>
          </div>
          <div class="config-item">
            <span class="label">全勤奖</span>
            <span class="value">¥{{ config.fullAttendanceBonus }}</span>
          </div>
          <div class="config-item">
            <span class="label">迟到扣款</span>
            <span class="value">¥{{ config.lateDeduction }}/次</span>
          </div>
          <div class="config-item">
            <span class="label">生效月份</span>
            <span class="value">{{ config.effectiveMonth }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="configDialogVisible" title="修改薪资配置" width="500px">
      <el-form :model="configForm" label-width="120px">
        <el-form-item label="岗位">
          <el-select v-model="configForm.role" placeholder="请选择岗位">
            <el-option label="前台收鞋店员" value="receptionist" />
            <el-option label="洗护技工" value="technician" />
            <el-option label="翻新师傅" value="repairer" />
          </el-select>
        </el-form-item>
        <el-form-item label="底薪">
          <el-input-number v-model="configForm.baseSalary" :min="0" />
        </el-form-item>
        <el-form-item label="提成比例(%)" v-if="configForm.role !== 'technician'">
          <el-input-number v-model="configForm.commissionRate" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="计件单价(元/双)" v-if="configForm.role === 'technician'">
          <el-input-number v-model="configForm.pieceRate" :min="0" />
        </el-form-item>
        <el-form-item label="全勤奖">
          <el-input-number v-model="configForm.fullAttendanceBonus" :min="0" />
        </el-form-item>
        <el-form-item label="迟到扣款">
          <el-input-number v-model="configForm.lateDeduction" :min="0" />
        </el-form-item>
        <el-form-item label="生效月份">
          <el-date-picker
            v-model="configForm.effectiveMonth"
            type="month"
            format="YYYY-MM"
            value-format="YYYY-MM"
            placeholder="选择生效月份"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSalaryConfigs, createSalaryConfig } from '@/api/salary'
import dayjs from 'dayjs'

const configs = ref([])
const configDialogVisible = ref(false)

const configForm = reactive({
  role: 'receptionist',
  baseSalary: 3000,
  commissionRate: 5,
  pieceRate: 5,
  fullAttendanceBonus: 200,
  lateDeduction: 50,
  effectiveMonth: ''
})

const getRoleName = (role) => {
  const roleMap = {
    receptionist: '前台收鞋店员',
    technician: '洗护技工',
    repairer: '翻新师傅'
  }
  return roleMap[role] || role
}

const loadConfigs = async () => {
  configs.value = await getSalaryConfigs()
}

const showConfigDialog = () => {
  configForm.effectiveMonth = dayjs().add(1, 'month').format('YYYY-MM')
  configDialogVisible.value = true
}

const saveConfig = async () => {
  await createSalaryConfig(configForm)
  ElMessage.success('配置保存成功，将在指定月份生效')
  configDialogVisible.value = false
  loadConfigs()
}

onMounted(() => {
  loadConfigs()
})
</script>

<style lang="scss" scoped>
.config-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .config-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .label {
      color: #666;
    }
    
    .value {
      font-weight: 600;
      color: #333;
    }
  }
  
  &.receptionist {
    border-top: 4px solid #409EFF;
  }
  
  &.technician {
    border-top: 4px solid #67C23A;
  }
  
  &.repairer {
    border-top: 4px solid #E6A23C;
  }
}
</style>
