<template>
  <div class="profile-page">
    <van-nav-bar title="个人中心" />
    
    <div class="page-content">
      <div class="user-card">
        <van-cell-group inset>
          <van-cell>
            <template #title>
              <div class="user-info">
                <van-icon name="user-circle-o" size="48" />
                <div class="user-detail">
                  <div class="username">{{ user?.name }}</div>
                  <div class="role">{{ getRoleText(user?.role) }}</div>
                </div>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div class="stats-card">
        <van-cell-group inset>
          <van-grid :column-num="3" border="surround">
            <van-grid-item>
              <span class="stat-value">{{ stats.completed }}</span>
              <span class="stat-label">本月完成</span>
            </van-grid-item>
            <van-grid-item>
              <span class="stat-value">{{ stats.pairs }}</span>
              <span class="stat-label">本月双数</span>
            </van-grid-item>
            <van-grid-item>
              <span class="stat-value">¥{{ salary?.total || 0 }}</span>
              <span class="stat-label">预估工资</span>
            </van-grid-item>
          </van-grid>
        </van-cell-group>
      </div>

      <van-cell-group inset class="menu-group">
        <van-cell title="我的薪资" is-link @click="$router.push('/my-salary')" />
        <van-cell title="修改密码" is-link @click="showPasswordDialog = true" />
      </van-cell-group>

      <div class="logout-section">
        <van-button type="danger" block round @click="handleLogout">
          退出登录
        </van-button>
      </div>
    </div>

    <van-dialog v-model:show="showPasswordDialog" title="修改密码" show-cancel-button @confirm="changePassword">
      <van-form>
        <van-field
          v-model="passwordForm.oldPassword"
          type="password"
          label="原密码"
          placeholder="请输入原密码"
        />
        <van-field
          v-model="passwordForm.newPassword"
          type="password"
          label="新密码"
          placeholder="请输入新密码"
        />
        <van-field
          v-model="passwordForm.confirmPassword"
          type="password"
          label="确认密码"
          placeholder="请确认新密码"
        />
      </van-form>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showNotify, showDialog } from 'vant'
import { useUserStore } from '@/store/user'
import { getMySalary } from '@/api/salary'
import { getMyTasks } from '@/api/orders'

const router = useRouter()
const userStore = useUserStore()

const user = ref(null)
const salary = ref(null)
const stats = ref({ completed: 0, pairs: 0 })
const showPasswordDialog = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const getRoleText = (role) => {
  const roleMap = {
    admin: '管理员',
    receptionist: '前台收鞋',
    technician: '洗护技工',
    repairer: '翻新师傅'
  }
  return roleMap[role] || role
}

const handleLogout = async () => {
  await showDialog({
    title: '提示',
    message: '确定要退出登录吗？'
  })
  userStore.logout()
  router.push('/login')
}

const changePassword = () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showNotify({ type: 'danger', message: '两次密码输入不一致' })
    return false
  }
  showNotify({ type: 'success', message: '密码修改成功' })
  showPasswordDialog.value = false
  return true
}

const loadData = async () => {
  user.value = userStore.user
  
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  const [orders, salaryData] = await Promise.all([
    getMyTasks({ status: 'completed' }),
    getMySalary().catch(() => null)
  ])

  const monthOrders = orders.filter(o => new Date(o.updatedAt) >= new Date(monthStart))
  
  stats.value = {
    completed: monthOrders.length,
    pairs: monthOrders.reduce((sum, o) => sum + (o.shoes?.length || 0), 0)
  }

  salary.value = salaryData
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.user-card {
  margin-bottom: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-detail {
  .username {
    font-size: 18px;
    font-weight: 600;
  }
  
  .role {
    font-size: 14px;
    color: #646566;
    margin-top: 4px;
  }
}

.stats-card {
  margin-bottom: 16px;
  
  .stat-value {
    display: block;
    font-size: 20px;
    font-weight: 600;
    color: #07c160;
  }
  
  .stat-label {
    display: block;
    font-size: 12px;
    color: #646566;
    margin-top: 4px;
  }
}

.menu-group {
  margin-bottom: 24px;
}

.logout-section {
  padding: 0 16px;
}
</style>
