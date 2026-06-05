<template>
  <div class="tabbar-layout">
    <router-view />
    <van-tabbar v-model="active" route>
      <van-tabbar-item to="/tasks" icon="todo-list-o">任务</van-tabbar-item>
      <van-tabbar-item to="/stats" icon="chart-trending-o">统计</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const active = ref(0)
</script>

<style lang="scss" scoped>
.tabbar-layout {
  min-height: 100vh;
  padding-bottom: 50px;
}
</style>
