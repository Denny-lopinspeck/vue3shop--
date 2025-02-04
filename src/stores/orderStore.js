import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useOrdersStore = defineStore('adminOrders', {
  state: () => ({
    orders: [],
    isLoading: false
  }),

  actions: {
    async getOrders() {
      this.isLoading = true
      try {
        const response = await axios.get(`/api/${import.meta.env.VITE_APP_PATH}/admin/orders`)
        if (response.data.success) {
          this.orders = response.data.orders
        }
        return response.data
      } catch (error) {
        console.error('取得訂單列表失敗:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async deleteAllOrders() {
      try {
        const res = await axios.delete(`/api/${import.meta.env.VITE_APP_PATH}/admin/orders/all`)
        if (res.data.success) {
          this.orders = []
        }
        return res.data
      } catch (error) {
        console.error('刪除全部訂單失敗:', error)
        throw error
      }
    }
  }
})
