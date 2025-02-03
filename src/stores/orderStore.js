import { defineStore } from 'pinia'
import axiosInstance from '@/utils/axios'
import { testOrders } from '@/testData/testOrders'

const { VITE_APP_PATH } = import.meta.env

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: [],
    pagination: {},
    isTestMode: false,
  }),
  actions: {
    /**
     * 獲取訂單列表
     * @param {number} [page=1] - 當前頁數
     * @returns {Promise<void>}
     */
    async getOrders(page = 1) {
      if (this.isTestMode) {
        this.setTestOrders()
        return
      }
      try {
        const res = await axiosInstance.get(`/api/${VITE_APP_PATH}/admin/orders?page=${page}`)
        if (res.data.success) {
          this.setOrders(res.data.orders, res.data.pagination)
        } else {
          this.resetOrders()
          throw new Error('獲取訂單失敗')
        }
      } catch {
        console.error('獲取訂單失敗')
        this.handleError()
      }
    },

    /**
     * 更新訂單資訊
     * @param {number|string} orderId - 訂單 ID
     * @param {Object} orderData - 更新資料
     * @returns {Promise<Object>}
     */
    async updateOrder(orderId, orderData) {
      if (this.isTestMode) {
        this.updateTestOrder(orderId, orderData)
        return {
          success: true,
          message: '已更新訂單資訊',
        }
      }
      try {
        const res = await axiosInstance.put(`/api/${VITE_APP_PATH}/admin/order/${orderId}`, {
          data: orderData,
        })
        if (res.data.success) {
          await this.getOrders()
        }
        return res.data
      } catch (error) {
        console.error('更新訂單失敗')
        throw error
      }
    },

    /**
     * 刪除單筆訂單
     * @param {number|string} orderId - 訂單 ID
     * @returns {Promise<Object>}
     */
    async deleteOrder(orderId) {
      if (this.isTestMode) {
        this.deleteTestOrder(orderId)
        return {
          success: true,
          message: '已刪除',
        }
      }
      try {
        const res = await axiosInstance.delete(`/api/${VITE_APP_PATH}/admin/order/${orderId}`)
        if (res.data.success) {
          await this.getOrders()
        }
        return res.data
      } catch (error) {
        console.error('刪除訂單失敗')
        throw error
      }
    },

    /**
     * 刪除全部訂單
     * @returns {Promise<Object>}
     */
    async deleteAllOrders() {
      if (this.isTestMode) {
        this.resetOrders()
        return {
          success: true,
          message: '已刪除全部訂單',
        }
      }
      try {
        const res = await axiosInstance.delete(`/api/${VITE_APP_PATH}/admin/orders/all`)
        if (res.data.success) {
          await this.getOrders()
        }
        return res.data
      } catch (error) {
        console.error('刪除全部訂單失敗')
        throw error
      }
    },

    /**
     * 切換測試模式並獲取訂單
     */
    toggleTestMode() {
      this.isTestMode = !this.isTestMode
      this.getOrders()
    },

    /**
     * 設置測試訂單
     */
    setTestOrders() {
      this.setOrders(testOrders, {
        total_pages: 1,
        current_page: 1,
        has_pre: false,
        has_next: false,
      })
    },

    /**
     * 重置訂單，清空資料
     */
    resetOrders() {
      this.setOrders([], {})
    },

    /**
     * 處理錯誤：根據模式進行不同資料初始化
     */
    handleError() {
      if (this.isTestMode) {
        this.setTestOrders()
      } else {
        this.resetOrders()
      }
    },

    /**
     * 設置訂單和分頁資訊
     * @param {Array} orders - 訂單列表
     * @param {Object} pagination - 分頁資訊
     */
    setOrders(orders, pagination) {
      this.orders = orders
      this.pagination = pagination
    },

    /**
     * 更新測試訂單
     * @param {number|string} orderId - 訂單 ID
     * @param {Object} orderData - 新的訂單資料
     */
    updateTestOrder(orderId, orderData) {
      const index = this.orders.findIndex((order) => order.id === orderId)
      if (index !== -1) {
        this.orders[index] = { ...this.orders[index], ...orderData }
      }
    },

    /**
     * 刪除測試訂單
     * @param {number|string} orderId - 訂單 ID
     */
    deleteTestOrder(orderId) {
      this.orders = this.orders.filter((order) => order.id !== orderId)
    },
  },
})
