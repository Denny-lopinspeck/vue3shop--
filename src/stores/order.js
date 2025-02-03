import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useOrderStore = defineStore('order', {
  state: () => ({
    currentOrder: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    /**
     * 根據訂單ID獲取訂單
     * @param {string} orderId - 訂單ID
     * @returns {Promise<Object>} 返回訂單資訊
     */
    async getOrderById(orderId) {
      this.isLoading = true
      try {
        const response = await axios.get(`/v2/api/${import.meta.env.VITE_APP_PATH}/order/${orderId}`)
        if (!response.data.success) {
          throw new Error(response.data.message)
        }

        const order = response.data.order
        // 確保金額為數字
        order.total = Number(order.total || 0)
        order.final_total = Number(order.final_total || 0)

        // 計算優惠券折扣金額
        if (order.coupon) {
          order.couponDiscount = order.total - order.final_total
          // 確保優惠券資訊完整
          order.coupon = {
            code: order.coupon.code || '',
            title: order.coupon.title || '',
            percent: order.coupon.percent || 0,
            due_date: order.coupon.due_date
          }
        }

        // 處理商品資料
        if (order.products) {
          order.products = Object.entries(order.products).map(([id, item]) => ({
            id,
            ...item,
            total: Number(item.price || 0) * Number(item.qty || 0)
          }))
        }

        this.currentOrder = order
        return order
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 付款訂單
     * @param {string} orderId 訂單 ID
     * @returns {Promise<object>} 付款結果，包含 success 與其他訂單資料
     */
    async payOrder(orderId) {
      if (!orderId) {
        throw new Error('訂單編號不存在')
      }

      this.isLoading = true
      try {
        // 檢查訂單狀態
        const orderStatus = await this.getOrderById(orderId)
        if (!orderStatus) {
          throw new Error('找不到訂單')
        }

        const response = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/pay/${orderId}`)

        if (!response.data.success) {
          throw new Error(response.data.message || '付款處理失敗')
        }

        // 重新獲取最新訂單狀態
        const updatedOrder = await this.getOrderById(orderId)

        return {
          success: true,
          order: updatedOrder
        }
      } catch (error) {
        console.error('付款處理發生錯誤:', error)
        throw new Error(error.message || '付款處理失敗')
      } finally {
        this.isLoading = false
      }
    },
  },
})
