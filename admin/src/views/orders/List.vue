<template>
  <div class="page-container">
    <div class="page-header flex-between">
      <h1 class="page-title">订单管理</h1>
      <el-button type="primary" @click="showCreate = true">
        <el-icon><Plus /></el-icon>
        新建订单
      </el-button>
    </div>

    <el-card shadow="hover">
      <el-form :inline="true" :model="searchForm" class="mb-20">
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待分派" value="pending" />
            <el-option label="已分派" value="assigned" />
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取鞋" value="picked_up" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="订单号/取鞋码/顾客姓名/电话"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="orders" border stripe style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="160" />
        <el-table-column prop="pickupCode" label="取鞋码" width="100" />
        <el-table-column prop="customer.name" label="顾客姓名" width="100" />
        <el-table-column prop="customer.phone" label="联系电话" width="130" />
        <el-table-column label="洗护鞋子" width="100">
          <template #default="{ row }">
            {{ row.shoes?.length || 0 }} 双
          </template>
        </el-table-column>
        <el-table-column prop="actualAmount" label="实收金额" width="100">
          <template #default="{ row }">
            ¥{{ row.actualAmount }}
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="receptionist.name" label="收鞋店员" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row._id)">
              详情
            </el-button>
            <el-button link type="primary" @click="openAssign(row)" v-if="row.status === 'pending'">
              分派
            </el-button>
            <el-button link type="success" @click="markPickedUp(row)" v-if="row.status === 'completed'">
              取鞋
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="assignDialogVisible" title="订单分派" width="500px">
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="洗护技工">
          <el-select v-model="assignForm.technician" placeholder="请选择技工">
            <el-option
              v-for="tech in technicians"
              :key="tech._id"
              :label="tech.name"
              :value="tech._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="翻新师傅">
          <el-select v-model="assignForm.repairer" placeholder="请选择翻新师傅">
            <el-option
              v-for="rep in repairers"
              :key="rep._id"
              :label="rep.name"
              :value="rep._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定分派</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCreate" title="新建订单" width="800px">
      <div class="create-order-form">
        <h3>顾客信息</h3>
        <el-form :model="newOrder.customer" label-width="100px">
          <el-form-item label="手机号码">
            <el-input v-model="newOrder.customer.phone" @blur="checkCustomer" />
          </el-form-item>
          <el-form-item label="顾客姓名">
            <el-input v-model="newOrder.customer.name" />
          </el-form-item>
        </el-form>

        <h3>鞋子信息</h3>
        <div v-for="(shoe, index) in newOrder.shoes" :key="index" class="shoe-item">
          <el-divider>鞋子 {{ index + 1 }}</el-divider>
          <el-form :model="shoe" label-width="100px">
            <el-form-item label="鞋款类型">
              <el-input v-model="shoe.shoeType" placeholder="如：运动鞋、皮鞋" />
            </el-form-item>
            <el-form-item label="品牌">
              <el-input v-model="shoe.shoeBrand" placeholder="如：Nike、阿迪达斯" />
            </el-form-item>
            <el-form-item label="颜色">
              <el-input v-model="shoe.shoeColor" />
            </el-form-item>
            <el-form-item label="洗护项目">
              <el-select
                v-model="shoe.selectedServices"
                multiple
                placeholder="请选择洗护项目"
                style="width: 100%"
              >
                <el-option
                  v-for="item in serviceItems"
                  :key="item._id"
                  :label="`${item.name} - ¥${item.price}`"
                  :value="{ _id: item._id, name: item.name, type: item.category, price: item.price }"
                />
              </el-select>
            </el-form-item>
          </el-form>
          <el-button type="danger" link @click="removeShoe(index)" v-if="newOrder.shoes.length > 1">
            移除
          </el-button>
        </div>
        <el-button type="primary" link @click="addShoe">+ 添加鞋子</el-button>

        <el-divider />
        <el-form label-width="100px">
          <el-form-item label="预估金额">
            <span>¥{{ calculateTotal() }}</span>
          </el-form-item>
          <el-form-item label="实收金额">
            <el-input-number v-model="newOrder.actualAmount" :min="0" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input type="textarea" v-model="newOrder.notes" :rows="3" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="createOrder">创建订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getOrders, assignOrder, updateOrderStatus, createOrder as apiCreateOrder } from '@/api/orders'
import { getUsers } from '@/api/users'
import { getCustomerByPhone } from '@/api/customers'
import { getServiceItems } from '@/api/serviceItems'

const router = useRouter()
const orders = ref([])
const technicians = ref([])
const repairers = ref([])
const serviceItems = ref([])
const assignDialogVisible = ref(false)
const showCreate = ref(false)
const currentOrderId = ref('')

const searchForm = reactive({
  status: '',
  keyword: ''
})

const assignForm = reactive({
  technician: '',
  repairer: ''
})

const newOrder = reactive({
  customer: {
    name: '',
    phone: ''
  },
  shoes: [{
    shoeType: '',
    shoeBrand: '',
    shoeColor: '',
    selectedServices: []
  }],
  actualAmount: 0,
  notes: ''
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

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadOrders = async () => {
  const params = {
    ...searchForm
  }
  if (!params.status) delete params.status
  if (!params.keyword) delete params.keyword
  
  orders.value = await getOrders(params)
}

const resetSearch = () => {
  searchForm.status = ''
  searchForm.keyword = ''
  loadOrders()
}

const viewDetail = (id) => {
  router.push(`/orders/${id}`)
}

const openAssign = (row) => {
  currentOrderId.value = row._id
  assignForm.technician = row.technician?._id || ''
  assignForm.repairer = row.repairer?._id || ''
  assignDialogVisible.value = true
}

const confirmAssign = async () => {
  await assignOrder(currentOrderId.value, assignForm)
  ElMessage.success('分派成功')
  assignDialogVisible.value = false
  loadOrders()
}

const markPickedUp = async (row) => {
  await ElMessageBox.confirm('确认顾客已取鞋？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  await updateOrderStatus(row._id, 'picked_up')
  ElMessage.success('取鞋完成')
  loadOrders()
}

const checkCustomer = async () => {
  if (newOrder.customer.phone) {
    const customer = await getCustomerByPhone(newOrder.customer.phone)
    if (customer) {
      newOrder.customer.name = customer.name
    }
  }
}

const addShoe = () => {
  newOrder.shoes.push({
    shoeType: '',
    shoeBrand: '',
    shoeColor: '',
    selectedServices: []
  })
}

const removeShoe = (index) => {
  newOrder.shoes.splice(index, 1)
}

const calculateTotal = () => {
  let total = 0
  newOrder.shoes.forEach(shoe => {
    shoe.selectedServices?.forEach(service => {
      total += service.price || 0
    })
  })
  newOrder.actualAmount = total
  return total
}

const createOrder = async () => {
  const orderData = {
    customer: newOrder.customer,
    shoes: newOrder.shoes.map(shoe => ({
      shoeType: shoe.shoeType,
      shoeBrand: shoe.shoeBrand,
      shoeColor: shoe.shoeColor,
      services: shoe.selectedServices.map(s => ({
        _id: s._id,
        type: s.type,
        name: s.name,
        price: s.price
      }))
    })),
    actualAmount: newOrder.actualAmount,
    notes: newOrder.notes
  }

  await apiCreateOrder(orderData)
  ElMessage.success('订单创建成功')
  showCreate.value = false
  resetNewOrder()
  loadOrders()
}

const resetNewOrder = () => {
  newOrder.customer = { name: '', phone: '' }
  newOrder.shoes = [{ shoeType: '', shoeBrand: '', shoeColor: '', selectedServices: [] }]
  newOrder.actualAmount = 0
  newOrder.notes = ''
}

const loadEmployees = async () => {
  const users = await getUsers()
  technicians.value = users.filter(u => u.role === 'technician')
  repairers.value = users.filter(u => u.role === 'repairer')
}

const loadServiceItems = async () => {
  serviceItems.value = await getServiceItems({ isActive: true })
}

onMounted(() => {
  loadOrders()
  loadEmployees()
  loadServiceItems()
})
</script>

<style lang="scss" scoped>
.shoe-item {
  border: 1px solid #eee;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 4px;
}

.create-order-form h3 {
  margin: 20px 0 10px;
  font-size: 16px;
}
</style>
