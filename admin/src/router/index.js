import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/Default.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据概览' }
      },
      {
        path: 'production/board',
        name: 'ProductionBoard',
        component: () => import('@/views/production/Board.vue'),
        meta: { title: '生产看板' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/List.vue'),
        meta: { title: '订单管理' }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/orders/Detail.vue'),
        meta: { title: '订单详情' }
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/customers/List.vue'),
        meta: { title: '顾客管理' }
      },
      {
        path: 'employees',
        name: 'Employees',
        component: () => import('@/views/employees/List.vue'),
        meta: { title: '员工管理' }
      },
      {
        path: 'process-templates',
        name: 'ProcessTemplates',
        component: () => import('@/views/process/Templates.vue'),
        meta: { title: '工序模板' }
      },
      {
        path: 'salary/config',
        name: 'SalaryConfig',
        component: () => import('@/views/salary/Config.vue'),
        meta: { title: '薪资配置' }
      },
      {
        path: 'salary/records',
        name: 'SalaryRecords',
        component: () => import('@/views/salary/Records.vue'),
        meta: { title: '薪资核算' }
      },
      {
        path: 'salary/appeals',
        name: 'SalaryAppeals',
        component: () => import('@/views/salary/Appeals.vue'),
        meta: { title: '申诉复核' }
      },
      {
        path: 'salary/my',
        name: 'MySalary',
        component: () => import('@/views/salary/MySalary.vue'),
        meta: { title: '我的薪资' }
      },
      {
        path: 'stats/revenue',
        name: 'RevenueStats',
        component: () => import('@/views/stats/Revenue.vue'),
        meta: { title: '营收统计' }
      },
      {
        path: 'stats/service',
        name: 'ServiceStats',
        component: () => import('@/views/stats/Service.vue'),
        meta: { title: '服务统计' }
      },
      {
        path: 'stats/employee',
        name: 'EmployeeStats',
        component: () => import('@/views/stats/Employee.vue'),
        meta: { title: '员工业绩' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
