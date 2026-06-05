<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">顾客管理</h1>
    </div>

    <el-card shadow="hover">
      <el-form :inline="true" :model="searchForm" class="mb-20">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="姓名/手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="searchForm.memberLevel" placeholder="全部" clearable>
            <el-option label="普通会员" value="normal" />
            <el-option label="银卡会员" value="silver" />
            <el-option label="金卡会员" value="gold" />
            <el-option label="钻石会员" value="platinum" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCustomers">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="customers" border stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="memberLevel" label="会员等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getMemberLevelType(row.memberLevel)">
              {{ getMemberLevelName(row.memberLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalOrders" label="累计订单" width="100" />
        <el-table-column prop="totalAmount" label="累计消费" width="120">
          <template #default="{ row }">
            ¥{{ row.totalAmount || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row._id)">
              详情
            </el-button>
            <el-button link type="primary" @click="openEditDialog(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="顾客详情" width="700px">
      <div v-if="customerDetail">
        <el-descriptions :column="2" border class="mb-20">
          <el-descriptions-item label="姓名">{{ customerDetail.customer?.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ customerDetail.customer?.phone }}</el-descriptions-item>
          <el-descriptions-item label="会员等级">
            <el-tag :type="getMemberLevelType(customerDetail.customer?.memberLevel)">
              {{ getMemberLevelName(customerDetail.customer?.memberLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="地址">{{ customerDetail.customer?.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="累计订单">{{ customerDetail.customer?.totalOrders || 0 }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">¥{{ customerDetail.customer?.totalAmount || 0 }}</el-descriptions-item>
        </el-descriptions>

        <h4>历史订单</h4>
        <el-table :data="customerDetail.orders" size="small" border>
          <el-table-column prop="orderNo" label="订单号" width="150" />
          <el-table-column label="鞋子数量" width="100">
            <template #default="{ row }">{{ row.shoes?.length || 0 }} 双</template>
          </el-table-column>
          <el-table-column prop="actualAmount" label="金额" width="100">
            <template #default="{ row }">¥{{ row.actualAmount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑顾客" width="500px">
      <el-form :model="customerForm" label-width="100px">
        <el-form-item label="姓名">
          <el-input v-model="customerForm.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="customerForm.phone" />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="customerForm.memberLevel" style="width: 100%">
            <el-option label="普通会员" value="normal" />
            <el-option label="银卡会员" value="silver" />
            <el-option label="金卡会员" value="gold" />
            <el-option label="钻石会员" value="platinum" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="customerForm.address" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomer">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { getCustomers, getCustomerById, updateCustomer } from '@/api/customers'

const customers = ref([])
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const customerDetail = ref(null)
const currentCustomerId = ref('')

const searchForm = reactive({
  keyword: '',
  memberLevel: ''
})

const customerForm = reactive({
  name: '',
  phone: '',
  memberLevel: 'normal',
  address: ''
})

const getMemberLevelName = (level) => {
  const map = {
    normal: '普通会员',
    silver: '银卡会员',
    gold: '金卡会员',
    platinum: '钻石会员'
  }
  return map[level] || level
}

const getMemberLevelType = (level) => {
  const map = {
    normal: 'info',
    silver: 'primary',
    gold: 'warning',
    platinum: 'danger'
  }
  return map[level] || 'info'
}

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

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadCustomers = async () => {
  const params = { ...searchForm }
  if (!params.keyword) delete params.keyword
  if (!params.memberLevel) delete params.memberLevel
  customers.value = await getCustomers(params)
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.memberLevel = ''
  loadCustomers()
}

const viewDetail = async (id) => {
  customerDetail.value = await getCustomerById(id)
  detailDialogVisible.value = true
}

const openEditDialog = (row) => {
  currentCustomerId.value = row._id
  customerForm.name = row.name
  customerForm.phone = row.phone
  customerForm.memberLevel = row.memberLevel
  customerForm.address = row.address || ''
  editDialogVisible.value = true
}

const saveCustomer = async () => {
  await updateCustomer(currentCustomerId.value, customerForm)
  ElMessage.success('保存成功')
  editDialogVisible.value = false
  loadCustomers()
}

loadCustomers()
</script>
