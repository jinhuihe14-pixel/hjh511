import { defineStore } from 'pinia'
import { login } from '@/api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('frontend_token') || '',
    user: JSON.parse(localStorage.getItem('frontend_user') || 'null')
  }),
  
  actions: {
    async login(username, password) {
      const res = await login(username, password)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('frontend_token', res.token)
      localStorage.setItem('frontend_user', JSON.stringify(res.user))
      return res
    },
    
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('frontend_token')
      localStorage.removeItem('frontend_user')
    }
  }
})
