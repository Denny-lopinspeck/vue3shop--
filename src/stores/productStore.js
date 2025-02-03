import { defineStore } from 'pinia'
import axiosInstance from '@/utils/axios'

const { VITE_APP_PATH } = import.meta.env

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [], // 存儲產品列表
    pagination: {}, // 存儲分頁信息
    isLoading: false, // 加載狀態
  }),
  actions: {
    // 獲取產品列表
    async getProducts() {
      this.isLoading = true
      try {
        const res = await axiosInstance.get(`/api/${VITE_APP_PATH}/admin/products`)
        if (res.data.success) {
          this.products = res.data.products
          this.pagination = res.data.pagination
        } else {
          throw new Error(res.data.message)
        }
      } finally {
        this.isLoading = false
      }
    },
    // 刪除產品
    async deleteProduct(id) {
      const res = await axiosInstance.delete(`/api/${VITE_APP_PATH}/admin/product/${id}`)
      if (res.data.success) {
        await this.getProducts()
      }
      return res.data
    },
    // 更新或新增產品
    async updateProduct(product, isNew) {
      const method = isNew ? 'post' : 'put'
      const url = `/api/${VITE_APP_PATH}/admin/product${isNew ? '' : `/${product.id}`}`

      const res = await axiosInstance[method](url, { data: product })
      if (res.data.success) {
        await this.getProducts()
      }
      return res.data
    },
  },
})
