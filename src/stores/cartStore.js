import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useCartStore = defineStore('cart', {
  state: () => ({
    cart: {
      carts: [],
      total: 0,
      final_total: 0,
      coupon: {
        code: '',
        percent: 0,
        isApplied: false,
        previewDiscount: 0
      }
    },
    isLoading: false,
    validationRules: {
      minPrice: 0,
      maxDiscount: 100,
      minPurchaseAmount: 100,
      maxQuantityPerItem: 99
    }
  }),

  getters: {
    cartItemCount: (state) => state.cart.carts.reduce((sum, item) => sum + item.qty, 0),
    totalAmount: (state) => state.cart.final_total || 0,
    calculatedDiscount: (state) => state.cart.total - state.cart.final_total,
    displayTotal: (state) => state.cart.total,
    displayDiscount: (state) => state.cart.coupon.previewDiscount,
    displayFinalTotal: (state) => state.cart.total - state.cart.coupon.previewDiscount,
  },

  actions: {
    // 取得購物車資料
    async getCart() {
      try {
        const { data } = await axios.get(`/api/${import.meta.env.VITE_APP_PATH}/cart`)
        if (!data?.success) throw new Error('取得購物車失敗')

        // 從 localStorage 讀取優惠券資訊
        const savedCoupon = JSON.parse(localStorage.getItem('cart-coupon') || '{}')

        this.$patch((state) => {
          state.cart = {
            ...data.data,
            coupon: savedCoupon.isApplied ? savedCoupon : state.cart.coupon,
          }
        })

        // 如果有優惠券，重新計算折扣
        if (this.cart.coupon.isApplied) {
          this.cart.coupon.previewDiscount = Math.floor(
            this.cart.total * (this.cart.coupon.percent / 100)
          )
        }

        // 同步購物車資料到 localStorage
        this.saveCartToStorage()
        return data
      } catch {
        throw new Error('無法取得購物車資料')
      }
    },

    saveCartToStorage() {
      localStorage.setItem('cart-data', JSON.stringify(this.cart))
      // 單獨儲存優惠券資訊
      localStorage.setItem('cart-coupon', JSON.stringify(this.cart.coupon))
    },

    // 驗證商品庫存數量
    validateQuantity(qty, stock) {
      const parsedQty = Number(qty);
      const parsedStock = Number(stock);

      if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty > parsedStock) {
        return {
          isValid: false,
          message: '數量無效',
        }
      }

      return {
        isValid: true,
        message: '',
      }
    },

    // 加入商品到購物車
    async addToCart(productId, qty = 1) {
      const currentItem = this.cart.carts.find((item) => item.product_id === productId)

      if (currentItem) {
        const { product } = currentItem
        const newQty = currentItem.qty + qty
        const stock = product?.unit || 0
        const validation = this.validateQuantity(newQty, stock)

        if (!validation.isValid) {
          throw new Error(validation.message)
        }
      }

      const { data } = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/cart`, {
        data: { product_id: productId, qty },
      })

      if (data.success) {
        await this.getCart()
      }

      return data
    },

    // 更新購物車商品數量
    async updateCart(cartId, productId, qty) {
      const data = {
        product_id: productId,
        qty,
      }
      const response = await axios.put(`/api/${import.meta.env.VITE_APP_PATH}/cart/${cartId}`, {
        data,
      })
      if (response.data.success) {
        await this.getCart()
      }
      return response.data
    },

    // 移除購物車商品
    async removeCartItem(cartId) {
      const response = await axios.delete(`/api/${import.meta.env.VITE_APP_PATH}/cart/${cartId}`)
      if (response.data.success) {
        await this.getCart()
      }
      return response.data
    },

    // 清空購物車
    async clearCart() {
      if (!this.cart.carts || this.cart.carts.length === 0) {
        return {
          success: true,
          message: '購物車已經是空的',
        }
      }

      const response = await axios.delete(`/api/${import.meta.env.VITE_APP_PATH}/carts`)

      if (response.data.success) {
        this.clearCartData()
      }

      return response.data
    },

    // 建立訂單
    async createOrder(orderData) {
      if (!this.cart.carts?.length) {
        throw new Error('購物車內無商品')
      }

      const stockErrors = this.cart.carts
        .map((item) => {
          const validation = this.validateQuantity(item.qty, item.product?.unit)
          return !validation.isValid ? null : null
        })
        .filter(Boolean)

      if (stockErrors.length > 0) {
        throw new Error('商品數量檢查失敗')
      }

      const finalOrderData = {
        ...orderData,
        ...(this.cart.coupon.isApplied && { coupon_code: this.cart.coupon.code }),
      }

      const { data } = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/order`, {
        data: finalOrderData,
      })

      if (!data?.success) {
        throw new Error('建立訂單失敗')
      }

      await this.clearCart()
      return {
        success: true,
        orderId: data.orderId,
        message: '訂單建立成功',
      }
    },

    // 套用優惠券
    async applyCoupon(code) {
      if (!code?.trim()) {
        throw new Error('請輸入優惠券代碼')
      }
      try {
        const response = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/coupon`, {
          data: { code },
        })
        if (!response.data?.success) {
          throw new Error(response.data?.message || '優惠券無效')
        }

        const finalTotalFromApi = response.data.data.final_total
        const currentTotal = this.cart.total
        const discount = currentTotal - finalTotalFromApi
        const couponPercent = currentTotal > 0 ? Math.floor((discount / currentTotal) * 100) : 0

        this.$patch((state) => {
          state.cart.coupon = {
            code,
            percent: couponPercent,
            isApplied: true,
            previewDiscount: discount,
          }
        })

        // 儲存優惠券資訊
        this.saveCartToStorage()

        return {
          success: true,
          message: response.data.message,
          discount,
          percent: couponPercent,
        }
      } catch (error) {
        this.clearCouponData()
        throw new Error(error.message || '優惠券驗證失敗')
      }
    },

    clearCouponData() {
      this.$patch((state) => {
        state.cart.coupon = {
          code: '',
          percent: 0,
          isApplied: false,
          previewDiscount: 0
        }
      })
      // 清除優惠券儲存
      localStorage.removeItem('cart-coupon')
    },

    clearCartData() {
      this.$patch((state) => {
        state.cart = {
          carts: [],
          total: 0,
          final_total: 0,
          coupon: {
            code: '',
            percent: 0,
            isApplied: false,
            previewDiscount: 0
          }
        }
      })

      // 清除 localStorage 中的購物車資料
      localStorage.removeItem('cart-data')

      this.getCart()
    },

    clearCoupon() {
      this.cart.coupon = {
        code: '',
        percent: 0,
        isApplied: false
      }
    }
  },
})
