<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">服务项目管理</h1>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>
        新增项目
      </el-button>
    </div>

    <el-card shadow="hover">
      <el-form :inline="true" :model="searchForm" class="mb-20">
        <el-form-item label="状态">
          <el-select v-model="searchForm.isActive" placeholder="全部" clearable>
            <el-option label="启用中" value="true" />
            <el-option label="已停用" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部" clearable>
            <el-option label="清洗" value="cleaning" />
            <el-option label="维修" value="repair" />
            <el-option label="翻新" value="renew" />
            <el-option label="奢护" value="luxury" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadItems">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="items" border stripe style="width: 100%">
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="name" label="项目名称" width="160" />
        <el-table-column label="所属分类" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)">
              {{ getCategoryText(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="单价" width="100" align="right">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="提成比例(%)" width="120" align="center">
          <template #default="{ row }">{{ row.commissionRate || 0 }}</template>
        </el-table-column>
        <el-table-column label="计件单价" width="100" align="center">
          <template #default="{ row }">¥{{ row.pieceRate || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用中' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link :type="row.isActive ? 'warning' : 'success'" @click="handleToggle(row)">
              {{ row.isActive ? '停用' : '启用' }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑服务项目' : '新增服务项目'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="所属分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="清洗" value="cleaning" />
            <el-option label="维修" value="repair" />
            <el-option label="翻新" value="renew" />
            <el-option label="奢护" value="luxury" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价(元)" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="提成比例(%)" prop="commissionRate">
          <el-input-number v-model="form.commissionRate" :min="0" :max="100" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计件单价(元)" prop="pieceRate">
          <el-input-number v-model="form.pieceRate" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序权重" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input type="textarea" v-model="form.description" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getServiceItems,
  createServiceItem,
  updateServiceItem,
  toggleServiceItem,
  deleteServiceItem
} from '@/api/serviceItems'

const items = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formRef = ref(null)

const searchForm = reactive({
  isActive: '',
  category: ''
})

const form = reactive({
  name: '',
  category: '',
  price: 0,
  commissionRate: 0,
  pieceRate: 0,
  sortOrder: 0,
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }]
}

const getCategoryText = (category) => {
  const map = {
    cleaning: '清洗',
    repair: '维修',
    renew: '翻新',
    luxury: '奢护'
  }
  return map[category] || category
}

const getCategoryTagType = (category) => {
  const map = {
    cleaning: 'primary',
    repair: 'warning',
    renew: 'success',
    luxury: 'danger'
  }
  return map[category] || 'info'
}

const loadItems = async () => {
  const params = {}
  if (searchForm.isActive !== '') params.isActive = searchForm.isActive
  if (searchForm.category) params.category = searchForm.category

  items.value = await getServiceItems(params)
}

const resetSearch = () => {
  searchForm.isActive = ''
  searchForm.category = ''
  loadItems()
}

const openCreate = () => {
  isEdit.value = false
  editingId.value = ''
  form.name = ''
  form.category = ''
  form.price = 0
  form.commissionRate = 0
  form.pieceRate = 0
  form.sortOrder = 0
  form.description = ''
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  editingId.value = row._id
  form.name = row.name
  form.category = row.category
  form.price = row.price
  form.commissionRate = row.commissionRate || 0
  form.pieceRate = row.pieceRate || 0
  form.sortOrder = row.sortOrder || 0
  form.description = row.description || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    submitting.value = true

    if (isEdit.value) {
      await updateServiceItem(editingId.value, form)
      ElMessage.success('更新成功')
    } else {
      await createServiceItem(form)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadItems()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleToggle = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.isActive ? '停用' : '启用'}「${row.name}」吗？`,
      '提示',
      { type: 'warning' }
    )
    await toggleServiceItem(row._id)
    ElMessage.success('操作成功')
    loadItems()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.name}」吗？删除后不可恢复。`,
      '提示',
      { type: 'warning' }
    )
    await deleteServiceItem(row._id)
    ElMessage.success('删除成功')
    loadItems()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

onMounted(() => {
  loadItems()
})
</script>

<style lang="scss" scoped>
.mb-20 {
  margin-bottom: 20px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
