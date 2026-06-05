<template>
  <div class="login-page">
    <div class="login-header">
      <h2>洗鞋服务</h2>
      <p>专业洗护 用心呵护</p>
    </div>
    
    <div class="login-form">
      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field
            v-model="form.phone"
            name="phone"
            label="手机号"
            placeholder="请输入手机号"
            type="tel"
            :rules="[{ required: true, message: '请输入手机号' }]"
          />
          <van-field
            v-model="form.code"
            name="code"
            label="验证码"
            placeholder="请输入验证码"
            center
            :rules="[{ required: true, message: '请输入验证码' }]"
          >
            <template #button>
              <van-button size="small" type="primary" :disabled="counting" @click="sendCode">
                {{ counting ? count + 's' : '获取验证码' }}
              </van-button>
            </template>
          </van-field>
        </van-cell-group>
        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            登录
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showNotify } from 'vant'
import { useCustomerStore } from '@/store/customer'
import { getCustomerByPhone } from '@/api/orders'

const router = useRouter()
const customerStore = useCustomerStore()
const loading = ref(false)
const counting = ref(false)
const count = ref(60)

const form = reactive({
  phone: '',
  code: ''
})

const sendCode = () => {
  if (!form.phone) {
    showNotify({ type: 'warning', message: '请先输入手机号' })
    return
  }
  counting.value = true
  showNotify({ type: 'success', message: '验证码已发送' })
  const timer = setInterval(() => {
    count.value--
    if (count.value <= 0) {
      clearInterval(timer)
      counting.value = false
      count.value = 60
    }
  }, 1000)
}

const handleLogin = async () => {
  try {
    loading.value = true
    const customer = await getCustomerByPhone(form.phone)
    if (customer) {
      customerStore.login(customer)
      showNotify({ type: 'success', message: '登录成功' })
      router.push('/home')
    } else {
      showNotify({ type: 'danger', message: '未找到用户信息' })
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-top: 100px;
}

.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 50px;
  
  h2 {
    font-size: 28px;
    margin-bottom: 10px;
  }
  
  p {
    font-size: 16px;
    opacity: 0.9;
  }
}

.login-form {
  padding: 0 20px;
}
</style>
