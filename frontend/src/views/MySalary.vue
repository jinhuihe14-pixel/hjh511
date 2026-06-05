<template>
  <div class="my-salary-page">
    <van-nav-bar title="我的薪资" left-text="返回" left-arrow @click-left="$router.back()" />
    
    <div class="page-content" v-if="salary">
      <div class="salary-card">
        <div class="salary-total">
          <div class="total-label">本月预估工资</div>
          <div class="total-amount">¥{{ salary.total || 0 }}</div>
        </div>
      </div>

      <van-cell-group inset>
        <van-cell title="底薪" :value="'¥' + (salary.baseSalary || 0)" />
        <van-cell title="提成/计件" :value="'¥' + (salary.commission || 0)" />
        <van-cell title="全勤奖" :value="'¥' + (salary.bonus || 0)" />
        <van-cell title="扣款" :value="'¥' + (salary.deduction || 0)" />
      </van-cell-group>

      <div class="section-title">薪资明细</div>
      <van-cell-group inset>
        <van-cell title="接单提成" :value="'¥' + (salary.receptionCommission || 0)" />
        <van-cell title="计件数量" :value="(salary.pieceCount || 0) + ' 双'" />
        <van-cell title="计件工资" :value="'¥' + (salary.pieceSalary || 0)" />
        <van-cell title="维修提成" :value="'¥' + (salary.repairCommission || 0)" />
      </van-cell-group>

      <div class="section-title">关联订单</div>
      <van-cell-group inset>
        <van-cell
          v-for="item in salary.details"
          :key="item.orderId"
          :title="item.orderNo"
          :value="'¥' + item.amount"
          is-link
          @click="$router.push(`/order-detail/${item.orderId}`)"
        />
      </van-cell-group>
    </div>

    <div v-else class="empty-tip">
      <van-empty description="暂无薪资数据" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMySalary } from '@/api/salary'

const salary = ref(null)

const loadData = async () => {
  try {
    salary.value = await getMySalary()
  } catch (e) {
    salary.value = null
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.salary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 16px;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  color: #fff;
}

.salary-total {
  .total-label {
    font-size: 14px;
    opacity: 0.9;
    margin-bottom: 10px;
  }
  
  .total-amount {
    font-size: 36px;
    font-weight: bold;
  }
}

.section-title {
  padding: 16px;
  color: #646566;
  font-size: 14px;
}

.empty-tip {
  padding-top: 80px;
}
</style>
