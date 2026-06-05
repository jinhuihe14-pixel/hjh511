<template>
  <div class="create-order-page">
    <van-nav-bar title="新建订单" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content">
      <van-form @submit="submitOrder">
        <div class="section-title">顾客信息</div>
        <van-cell-group inset>
          <van-field
            v-model="form.customer.phone"
            label="手机号"
            placeholder="请输入手机号"
            type="tel"
            :rules="[{ required: true, message: '请输入手机号' }]"
            @blur="checkCustomer"
          />
          <van-field
            v-model="form.customer.name"
            label="姓名"
            placeholder="请输入姓名"
            :rules="[{ required: true, message: '请输入姓名' }]"
          />
        </van-cell-group>

        <div class="section-title flex-between">
          <span>洗护鞋子</span>
          <van-button type="primary" size="small" plain @click="addShoe">+ 添加</van-button>
        </div>

        <div v-for="(shoe, index) in form.shoes" :key="index" class="shoe-card">
          <van-cell-group inset>
            <div class="shoe-header">
              <span class="shoe-title">鞋子 {{ index + 1 }}</span>
              <van-button
                v-if="form.shoes.length > 1"
                type="danger"
                size="small"
                plain
                @click="removeShoe(index)"
              >
                移除
              </van-button>
            </div>
            <van-field v-model="shoe.shoeType" label="鞋款类型" placeholder="如：运动鞋、皮鞋" />
            <van-field v-model="shoe.shoeBrand" label="品牌" placeholder="如：Nike、阿迪达斯" />
            <van-field v-model="shoe.shoeColor" label="颜色" placeholder="鞋子颜色" />
            <van-field label="洗护项目" is-link readonly :value="getSelectedServicesText(shoe)" @click="showServicePicker(index)" />
          </van-cell-group>
        </div>

        <div class="section-title">费用信息</div>
        <van-cell-group inset>
          <van-cell title="预估金额" :value="'¥' + totalAmount" />
          <van-field
            v-model.number="form.actualAmount"
            label="实收金额"
            type="number"
            :rules="[{ required: true, message: '请输入实收金额' }]"
          />
        </van-cell-group>

        <van-field
          v-model="form.notes"
          label="备注"
          type="textarea"
          placeholder="请输入备注信息"
          rows="2"
          class="mt-12"
        />

        <div class="submit-section">
          <van-button round block type="primary" native-type="submit" :loading="submitting">
            创建订单
          </van-button>
        </div>
      </van-form>
    </div>

    <van-popup v-model:show="servicePickerVisible" position="bottom">
      <van-picker
        :columns="serviceColumns"
        @confirm="onServiceConfirm"
        @cancel="servicePickerVisible = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showNotify, showDialog } from 'vant'
import { createOrder, getCustomerByPhone } from '@/api/orders'

const router = useRouter()
const submitting = ref(false)
const servicePickerVisible = ref(false)
const currentShoeIndex = ref(0)

const serviceOptions = [
  { text: '运动鞋洗护 - ¥35', value: { type: 'cleaning', name: '运动鞋洗护', price: 35 } },
  { text: '皮鞋翻新 - ¥80', value: { type: 'renew', name: '皮鞋翻新', price: 80 } },
  { text: '奢侈品护理 - ¥200', value: { type: 'luxury', name: '奢侈品护理', price: 200 } },
  { text: '换底修补 - ¥120', value: { type: 'repair', name: '换底修补', price: 120 } }
]

const serviceColumns = [
  {
    values: serviceOptions,
    defaultIndex: 0
  }
]

const form = reactive({
  customer: {
    name: '',
    phone: ''
  },
  shoes: [
    {
      shoeType: '',
      shoeBrand: '',
      shoeColor: '',
      selectedServices: []
    }
  ],
  actualAmount: 0,
  notes: ''
})

const totalAmount = computed(() => {
  let total = 0
  form.shoes.forEach(shoe => {
    shoe.selectedServices?.forEach(service => {
      total += service.price || 0
    })
  })
  return total
})

const checkCustomer = async () => {
  if (form.customer.phone) {
    try {
      const customer = await getCustomerByPhone(form.customer.phone)
      if (customer && customer.name) {
        form.customer.name = customer.name
      }
    } catch (e) {
    }
  }
}

const addShoe = () => {
  form.shoes.push({
    shoeType: '',
    shoeBrand: '',
    shoeColor: '',
    selectedServices: []
  })
}

const removeShoe = (index) => {
  form.shoes.splice(index, 1)
}

const getSelectedServicesText = (shoe) => {
  if (!shoe.selectedServices?.length) return '请选择'
  return shoe.selectedServices.map(s => s.name).join('、')
}

const showServicePicker = (index) => {
  currentShoeIndex.value = index
  servicePickerVisible.value = true
}

const onServiceConfirm = ({ selectedOptions }) => {
  const service = selectedOptions[0].value
  const shoe = form.shoes[currentShoeIndex.value]
  if (!shoe.selectedServices) {
    shoe.selectedServices = []
  }
  shoe.selectedServices.push(service)
  form.actualAmount = totalAmount.value
  servicePickerVisible.value = false
  showNotify({ type: 'success', message: '已添加服务项目' })
}

const submitOrder = async () => {
  try {
    submitting.value = true
    
    const orderData = {
      customer: form.customer,
      shoes: form.shoes.map(shoe => ({
        shoeType: shoe.shoeType,
        shoeBrand: shoe.shoeBrand,
        shoeColor: shoe.shoeColor,
        services: (shoe.selectedServices || []).map(s => ({
          type: s.type,
          name: s.name,
          price: s.price,
          commissionRate: 10
        }))
      })),
      totalAmount: totalAmount.value,
      actualAmount: form.actualAmount,
      notes: form.notes
    }

    const result = await createOrder(orderData)
    
    await showDialog({
      title: '订单创建成功',
      message: `取鞋码：${result.pickupCode}\n请告知顾客取鞋码`
    })

    router.back()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.shoe-card {
  margin-bottom: 16px;
}

.shoe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  
  .shoe-title {
    font-weight: 600;
  }
}

.submit-section {
  padding: 20px 16px;
}
</style>
