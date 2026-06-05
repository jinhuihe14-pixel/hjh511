import { defineStore } from 'pinia'

export const useCustomerStore = defineStore('customer', {
  state: () => ({
    customer: JSON.parse(localStorage.getItem('customer') || 'null')
  }),

  actions: {
    login(customerData) {
      this.customer = customerData
      localStorage.setItem('customer', JSON.stringify(customerData))
    },

    logout() {
      this.customer = null
      localStorage.removeItem('customer')
    }
  }
})
