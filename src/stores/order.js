import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useOrderStore = defineStore('customerOrder', {
  state: () => ({
    currentOrder: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    // 獲取指定訂單
    async getOrderById(orderId) {
      this.isLoading = true
      try {
        const response = await axios.get(`/v2/api/${import.meta.env.VITE_APP_PATH}/order/${orderId}`)
        if (!response.data.success) {
          throw new Error(response.data.message)
        }

        const orderData = response.data.order
        this.currentOrder = this.processOrderData(orderData)
        return this.currentOrder
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    processOrderData(orderData) {
      // 處理基本金額
      orderData.total = Number(orderData.total || 0)
      orderData.final_total = Number(orderData.final_total || 0)

      // 處理優惠券
      if (orderData.total > orderData.final_total) {
        const discountAmount = orderData.total - orderData.final_total
        const discountPercent = Number(orderData.coupon_code) || 0

        orderData.coupon = {
          code: orderData.coupon_code,
          title: `${discountPercent}% 折價券`,
          percent: discountPercent,
          due_date: orderData.coupon?.due_date || null,
          discount: discountAmount
        }

        orderData.discount = discountAmount
        orderData.discountPercent = discountPercent
      }

      // 處理商品資料
      if (orderData.products) {
        orderData.products = Object.entries(orderData.products).map(([id, item]) => ({
          id,
          ...item,
          total: Number(item.price || 0) * Number(item.qty || 0)
        }))
      }

      return orderData
    },

    // 付款處理
    async payOrder(orderId) {
      try {
        const paymentResult = await axios.post(
          `/api/${import.meta.env.VITE_APP_PATH}/pay/${orderId}`
        )

        return {
          success: paymentResult.data.success,
          message: paymentResult.data.message,
          order: this.currentOrder
        }
      } catch (error) {
        throw new Error(error?.response?.data?.message || '付款處理失敗')
      }
    },
  },
})
