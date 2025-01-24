import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useCartStore = defineStore('cart', {
  state: () => ({
    // 購物車狀態
    cart: {
      carts: [],
      total: 0,
      final_total: 0,
      coupon: {
        code: '',
        percent: 0,
        isApplied: false,
        previewDiscount: 0  // 優惠券折扣預覽金額
      }
    },
    isLoading: false,
    // 購物車驗證規則
    validationRules: {
      minPrice: 0,          // 最小價格
      maxDiscount: 100,     // 最大折扣百分比
      minPurchaseAmount: 100, // 最小購買金額
      maxQuantityPerItem: 99  // 單品最大購買數量
    }
  }),

  getters: {
    cartItemCount: (state) => state.cart.carts.reduce((sum, item) => sum + item.qty, 0),
    totalAmount: (state) => state.cart.final_total || 0,
    calculatedDiscount: (state) => state.cart.total - state.cart.final_total,
    displayTotal: (state) => state.cart.total,
    displayDiscount: (state) => state.cart.coupon.previewDiscount,
    displayFinalTotal: (state) => state.cart.total - state.cart.coupon.previewDiscount
  },

  actions: {
    async getCart() {
      try {
        const response = await axios.get(`/api/${import.meta.env.VITE_APP_PATH}/cart`)
        if (response.data.success) {

          const currentCoupon = this.cart.coupon
          this.cart = {
            ...response.data.data,
            coupon: currentCoupon
          }
        }
        return response.data
      } catch (error) {
        console.error('取得購物車失敗:', error)
        throw error
      }
    },

    // 驗證商品價格
    validatePrice(price) {
      return typeof price === 'number' &&
             price >= this.validationRules.minPrice &&
             !isNaN(price) &&
             Number.isFinite(price)
    },

    // 驗證折扣金額
    validateDiscount(total, discount) {
      if (!this.validatePrice(total) || !this.validatePrice(discount)) {
        return false
      }

      return discount >= 0 && discount <= total
    },

    // 驗證商品數量
    validateQuantity(qty, stock) {

      console.log('Validating quantity:', { qty, stock, maxLimit: this.validationRules.maxQuantityPerItem })


      qty = Number(qty)
      stock = Number(stock)

      if (isNaN(qty) || isNaN(stock)) {
        console.warn('Invalid quantity or stock:', { qty, stock })
        return false
      }


      return qty > 0 &&
             Number.isInteger(qty) &&
             qty <= stock &&
             qty <= this.validationRules.maxQuantityPerItem
    },

    // 加入購物車
    async addToCart(productId, qty = 1) {
      try {
        const currentItem = this.cart.carts.find(item => item.product_id === productId)

        if (currentItem) {
          const product = currentItem.product
          const newQty = currentItem.qty + qty
          const stock = product?.unit || 0

          if (!this.validateQuantity(newQty, stock)) {
            throw new Error(`數量無效或超過限制 (最大: ${Math.min(stock, this.validationRules.maxQuantityPerItem)})`)
          }
        }

        const response = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/cart`, {
          data: { product_id: productId, qty }
        })

        if (response.data.success) {
          await this.getCart()

          if (!this.validatePrice(this.cart.final_total)) {
            throw new Error('價格計算錯誤')
          }
        }
        return response.data
      } catch (error) {
        throw error
      }
    },

    async updateCart(cartId, productId, qty) {
      try {
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
      } catch (error) {
        throw error
      }
    },

    async removeCartItem(cartId) {
      try {
        const response = await axios.delete(`/api/${import.meta.env.VITE_APP_PATH}/cart/${cartId}`)
        if (response.data.success) {
          await this.getCart()
        }
        return response.data
      } catch (error) {
        throw error
      }
    },

    async clearCart() {
      try {
        if (!this.cart.carts || this.cart.carts.length === 0) {
          return {
            success: true,
            message: '購物車已經是空的',
          }
        }

        const response = await axios.delete(`/api/${import.meta.env.VITE_APP_PATH}/carts`)

        if (response.data.success) {
          this.cart = {
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
        }

        return response.data
      } catch (error) {
        console.error('清空購物車失敗:', error)
        throw error
      }
    },

    async refreshCart() {
      return await this.getCart()
    },

    // 建立訂單
    async createOrder(orderData) {
      try {
        
        // 購物車檢查
        if (!this.cart.carts?.length) {
          throw new Error('購物車內無商品')
        }

        // 驗證訂單金額
        if (!this.validatePrice(this.cart.final_total)) {
          throw new Error('訂單金額異常')
        }

        // 檢查每個商品的庫存狀況
        for (const item of this.cart.carts) {
          const stock = Number(item.product?.unit || 0)
          console.log('Checking item:', {
            title: item.product?.title,
            qty: item.qty,
            stock: stock
          })

          if (!this.validateQuantity(item.qty, stock)) {
            const maxAllowed = Math.min(stock, this.validationRules.maxQuantityPerItem)
            throw new Error(
              `商品 ${item.product?.title || '未知商品'} 數量異常\n` +
              `當前數量: ${item.qty}, 可用庫存: ${stock}, 最大限購: ${maxAllowed}`
            )
          }
        }

        const finalOrderData = {
          ...orderData
        }

        if (this.cart.coupon.isApplied) {
          finalOrderData.coupon_code = this.cart.coupon.code
        }

        const response = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/order`, {
          data: finalOrderData
        })

        if (!response.data.success) {
          throw new Error(response.data.message)
        }

        const orderId = response.data.orderId

        try {
          for (const item of this.cart.carts) {
            await this.removeCartItem(item.id)
          }

          this.clearCartData()
        } catch (error) {
          console.warn('清空購物車時發生問題，但訂單已建立:', error)
        }

        return {
          success: true,
          orderId,
        }
      } catch (error) {
        console.error('建立訂單失敗:', error)
        throw error
      }
    },

    async removeItemQuantity(cartId, productId, removeQty) {
      try {
        const cartItem = this.cart.carts.find((item) => item.id === cartId)
        if (!cartItem?.product) {
          throw new Error('找不到購物車項目')
        }

        const newQty = cartItem.qty - removeQty
        const stock = cartItem.product?.unit || 0

        if (newQty <= 0) {
          return await this.removeCartItem(cartId)
        }

        if (!this.validateQuantity(newQty, stock)) {
          throw new Error(`數量無效或超過庫存限制 (最大: ${stock})`)
        }

        return await this.updateCart(cartId, productId, newQty)
      } catch (error) {
        throw error
      }
    },

    // 套用優惠券
    async applyCoupon(code) {
      try {

        // 呼叫 API 驗證優惠券
        const response = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/coupon`, {
          data: { code }
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '優惠券無效')
        }

        // 計算折扣金額並更新狀態
        const percent = response.data.data.percent || 0
        this.cart.coupon = {
          code,
          percent,
          isApplied: true,
          previewDiscount: Math.floor(this.cart.total * (percent / 100))
        }

        console.log('優惠券套用結果:', {
          code,
          isSuccess: response.data.success,
          percent: this.cart.coupon.percent,
          calculatedDiscount: this.cart.coupon.previewDiscount,
          originalTotal: this.cart.total
        })

        return {
          success: true,
          message: '優惠券套用成功',
          discount: this.cart.coupon.previewDiscount,
          percent: this.cart.coupon.percent
        }
      } catch (error) {
        console.error('優惠券套用失敗:', error)
        this.clearCouponData()
        throw new Error(error.response?.data?.message || '優惠券驗證失敗')
      }
    },

    clearCouponData() {
      this.cart.coupon = {
        code: '',
        percent: 0,
        isApplied: false,
        previewDiscount: 0
      }
    },

    clearCartData() {
      this.cart = {
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

      this.getCart()
    }
  },
})
