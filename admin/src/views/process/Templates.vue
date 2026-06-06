<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">工序模板配置</h1>
      <div>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          新增模板
        </el-button>
      </div>
    </div>

    <el-card shadow="hover" v-loading="loading">
      <el-table :data="templates" border stripe>
        <el-table-column prop="serviceCategory" label="服务类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.serviceCategory)">
              {{ getCategoryText(row.serviceCategory) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" />
        <el-table-column label="工序数量" width="100" align="center">
          <template #default="{ row }">
            {{ row.steps?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="工序预览" min-width="400">
          <template #default="{ row }">
            <div class="process-preview">
              <template v-for="(step, idx) in row.steps" :key="step.key">
                <span class="step-item">{{ step.name }}</span>
                <el-icon v-if="idx < row.steps.length - 1" class="step-arrow">
                  <ArrowRight />
                </el-icon>
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button 
              :type="row.isActive ? 'warning' : 'success'" 
              link 
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑工序模板' : '新增工序模板'" 
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="100px" ref="formRef">
        <el-form-item label="服务类型" prop="serviceCategory">
          <el-select 
            v-model="form.serviceCategory" 
            placeholder="请选择服务类型"
            style="width: 200px;"
            :disabled="isEdit"
          >
            <el-option label="清洗类" value="cleaning" />
            <el-option label="维修类" value="repair" />
            <el-option label="翻新类" value="renew" />
            <el-option label="奢护类" value="luxury" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板名称" prop="name">
          <el-input 
            v-model="form.name" 
            placeholder="请输入模板名称"
            style="width: 300px;"
          />
        </el-form-item>
        <el-form-item label="工序列表">
          <div class="steps-editor">
            <div
              v-for="(step, index) in form.steps"
              :key="index"
              class="step-row"
            >
              <span class="step-order">{{ index + 1 }}</span>
              <el-input 
                v-model="step.key" 
                placeholder="工序标识"
                style="width: 120px; margin-right: 10px;"
              />
              <el-input 
                v-model="step.name" 
                placeholder="工序名称"
                style="width: 150px; margin-right: 10px;"
              />
              <el-select 
                v-model="step.role" 
                placeholder="负责角色"
                style="width: 120px; margin-right: 10px;"
              >
                <el-option label="前台" value="receptionist" />
                <el-option label="技工" value="technician" />
                <el-option label="翻新师" value="repairer" />
                <el-option label="质检" value="inspector" />
              </el-select>
              <el-input-number 
                v-model="step.estimatedDuration" 
                :min="0"
                :step="5"
                placeholder="预计时长(分)"
                style="width: 130px; margin-right: 10px;"
              />
              <div class="step-actions">
                <el-button 
                  type="primary" 
                  link 
                  size="small"
                  :disabled="index === 0"
                  @click="moveStep(index, -1)"
                >
                  <el-icon><Top /></el-icon>
                </el-button>
                <el-button 
                  type="primary" 
                  link 
                  size="small"
                  :disabled="index === form.steps.length - 1"
                  @click="moveStep(index, 1)"
                >
                  <el-icon><Bottom /></el-icon>
                </el-button>
                <el-button 
                  type="danger" 
                  link 
                  size="small"
                  @click="removeStep(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <el-button type="primary" plain @click="addStep">
              <el-icon><Plus /></el-icon>
              添加工序
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getProcessTemplates, createProcessTemplate, updateProcessTemplate } from '@/api/orders'

const loading = ref(false)
const templates = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const currentTemplateId = ref(null)

const form = ref({
  serviceCategory: '',
  name: '',
  steps: []
})

const getCategoryText = (category) => {
  const map = {
    cleaning: '清洗类',
    repair: '维修类',
    renew: '翻新类',
    luxury: '奢护类'
  }
  return map[category] || category
}

const getCategoryType = (category) => {
  const map = {
    cleaning: 'primary',
    repair: 'warning',
    renew: 'success',
    luxury: 'danger'
  }
  return map[category] || 'info'
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadTemplates = async () => {
  try {
    loading.value = true
    templates.value = await getProcessTemplates()
  } catch (error) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const openAddDialog = () => {
  isEdit.value = false
  currentTemplateId.value = null
  form.value = {
    serviceCategory: '',
    name: '',
    steps: []
  }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  currentTemplateId.value = row._id
  form.value = {
    serviceCategory: row.serviceCategory,
    name: row.name,
    steps: row.steps.map(s => ({
      key: s.key,
      name: s.name,
      sortOrder: s.sortOrder,
      role: s.role,
      estimatedDuration: s.estimatedDuration,
      description: s.description
    }))
  }
  dialogVisible.value = true
}

const addStep = () => {
  form.value.steps.push({
    key: '',
    name: '',
    sortOrder: form.value.steps.length + 1,
    role: 'technician',
    estimatedDuration: 0
  })
}

const removeStep = (index) => {
  form.value.steps.splice(index, 1)
  updateSortOrder()
}

const moveStep = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= form.value.steps.length) return
  
  const temp = form.value.steps[index]
  form.value.steps[index] = form.value.steps[newIndex]
  form.value.steps[newIndex] = temp
  
  updateSortOrder()
}

const updateSortOrder = () => {
  form.value.steps.forEach((step, index) => {
    step.sortOrder = index + 1
  })
}

const submitForm = async () => {
  try {
    if (!form.value.serviceCategory) {
      ElMessage.warning('请选择服务类型')
      return
    }
    if (!form.value.name) {
      ElMessage.warning('请输入模板名称')
      return
    }
    if (form.value.steps.length === 0) {
      ElMessage.warning('请至少添加一个工序')
      return
    }
    
    for (const step of form.value.steps) {
      if (!step.key || !step.name) {
        ElMessage.warning('请完善工序信息')
        return
      }
    }

    submitting.value = true
    
    if (isEdit.value) {
      await updateProcessTemplate(currentTemplateId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await createProcessTemplate(form.value)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    await loadTemplates()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    const action = row.isActive ? '禁用' : '启用'
    await ElMessageBox.confirm(
      `确定${action}该模板吗？`,
      '提示',
      { type: 'warning' }
    )
    
    await updateProcessTemplate(row._id, { isActive: !row.isActive })
    ElMessage.success(`${action}成功`)
    await loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style lang="scss" scoped>
.process-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  
  .step-item {
    background: #ecf5ff;
    color: #409eff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  
  .step-arrow {
    color: #c0c4cc;
    font-size: 12px;
  }
}

.steps-editor {
  width: 100%;
  
  .step-row {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    padding: 8px;
    background: #f5f7fa;
    border-radius: 4px;
    
    .step-order {
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      background: #409eff;
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
      margin-right: 10px;
    }
    
    .step-actions {
      display: flex;
      align-items: center;
    }
  }
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
