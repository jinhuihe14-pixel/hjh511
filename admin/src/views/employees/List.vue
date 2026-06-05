<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">员工管理</h1>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增员工
      </el-button>
    </div>

    <el-card shadow="hover">
      <el-form :inline="true" :model="searchForm" class="mb-20">
        <el-form-item label="岗位">
          <el-select v-model="searchForm.role" placeholder="全部" clearable>
            <el-option label="前台收鞋店员" value="receptionist" />
            <el-option label="洗护技工" value="technician" />
            <el-option label="翻新师傅" value="repairer" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadEmployees">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="employees" border stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="role" label="岗位" width="120">
          <template #default="{ row }">
            {{ getRoleName(row.role) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '在职' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hireDate" label="入职日期" width="150">
          <template #default="{ row }">
            {{ formatDate(row.hireDate) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="disableEmployee(row)" v-if="row.status === 'active'">
              禁用
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑员工' : '新增员工'" width="500px">
      <el-form ref="formRef" :model="employeeForm" :rules="rules" label-width="100px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="employeeForm.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="employeeForm.password" type="password" placeholder="默认123456" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="employeeForm.name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="employeeForm.phone" />
        </el-form-item>
        <el-form-item label="岗位" prop="role">
          <el-select v-model="employeeForm.role" style="width: 100%">
            <el-option label="前台收鞋店员" value="receptionist" />
            <el-option label="洗护技工" value="technician" />
            <el-option label="翻新师傅" value="repairer" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEmployee">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/users'

const employees = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref('')
const formRef = ref(null)

const searchForm = reactive({
  role: ''
})

const employeeForm = reactive({
  username: '',
  password: '123456',
  name: '',
  phone: '',
  role: 'receptionist'
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择岗位', trigger: 'change' }]
}

const getRoleName = (role) => {
  const roleMap = {
    receptionist: '前台收鞋店员',
    technician: '洗护技工',
    repairer: '翻新师傅',
    admin: '管理员'
  }
  return roleMap[role] || role
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD')
}

const loadEmployees = async () => {
  const params = { ...searchForm }
  if (!params.role) delete params.role
  employees.value = await getUsers(params)
}

const resetSearch = () => {
  searchForm.role = ''
  loadEmployees()
}

const showCreateDialog = () => {
  isEdit.value = false
  currentId.value = ''
  employeeForm.username = ''
  employeeForm.password = '123456'
  employeeForm.name = ''
  employeeForm.phone = ''
  employeeForm.role = 'receptionist'
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  currentId.value = row._id
  employeeForm.username = row.username
  employeeForm.name = row.name
  employeeForm.phone = row.phone
  employeeForm.role = row.role
  dialogVisible.value = true
}

const saveEmployee = async () => {
  await formRef.value?.validate()
  
  if (isEdit.value) {
    await updateUser(currentId.value, employeeForm)
    ElMessage.success('更新成功')
  } else {
    await createUser(employeeForm)
    ElMessage.success('创建成功')
  }
  
  dialogVisible.value = false
  loadEmployees()
}

const disableEmployee = async (row) => {
  await ElMessageBox.confirm('确定禁用该员工？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  await deleteUser(row._id)
  ElMessage.success('已禁用')
  loadEmployees()
}

loadEmployees()
</script>
