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
    // 計算購物車內商品數量
    cartItemCount: (state) => state.cart.carts.reduce((sum, item) => sum + item.qty, 0),
    // 總金額
    totalAmount: (state) => state.cart.final_total || 0,
    // 計算折扣金額
    calculatedDiscount: (state) => state.cart.total - state.cart.final_total,
    // 顯示總金額
    displayTotal: (state) => state.cart.total,
    // 顯示折扣金額
    displayDiscount: (state) => state.cart.coupon.previewDiscount,
    // 顯示最終金額
    displayFinalTotal: (state) => state.cart.total - state.cart.coupon.previewDiscount,
  },

  actions: {
    /**
     * 取得購物車資料
     * @returns {Promise<object>} 回傳 API 資料
     */
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

    // 新增儲存購物車資料的方法
    saveCartToStorage() {
      localStorage.setItem('cart-data', JSON.stringify(this.cart))
      // 單獨儲存優惠券資訊
      localStorage.setItem('cart-coupon', JSON.stringify(this.cart.coupon))
    },

    /**
     * 驗證商品價格
     * @param {number} price 商品價格
     * @returns {boolean} 是否有效
     */
    validatePrice(price) {
      return typeof price === 'number' &&
        price >= this.validationRules.minPrice &&
        !Number.isNaN(price) &&
        Number.isFinite(price) &&
        price >= 0
    },

    /**
     * 驗證折扣金額
     * @param {number} total 總價格
     * @param {number} discount 折扣金額
     * @returns {boolean} 是否有效
     */
    validateDiscount(total, discount) {
      return this.validatePrice(total) &&
        this.validatePrice(discount) &&
        discount >= 0 &&
        discount <= total
    },

    /**
     * 驗證商品數量
     * @param {number|string} qty 商品數量
     * @param {number|string} stock 庫存數量
     * @returns {object} 驗證結果與訊息
     */
    validateQuantity(qty, stock) {
      const parsedQty = parseInt(qty, 10)
      const parsedStock = parseInt(stock, 10)
      const maxAllowed = Math.min(parsedStock, this.validationRules.maxQuantityPerItem)

      if (Number.isNaN(parsedQty) || Number.isNaN(parsedStock)) {
        return {
          isValid: false,
          message: '數量或庫存格式無效',
        }
      }

      if (parsedQty <= 0) {
        return {
          isValid: false,
          message: '數量必須大於 0',
        }
      }

      if (parsedQty > maxAllowed) {
        return {
          isValid: false,
          message: `數量超過限制 (最大: ${maxAllowed})`,
        }
      }

      return {
        isValid: true,
        message: '',
      }
    },

    /**
     * 加入購物車
     * @param {number|string} productId 產品ID
     * @param {number} [qty=1] 加入數量，預設為 1
     * @returns {Promise<object>} API 回傳結果
     */
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

    /**
     * 更新購物車項目
     * @param {string|number} cartId 購物車項目ID
     * @param {number|string} productId 產品ID
     * @param {number} qty 更新後數量
     * @returns {Promise<object>} API 回傳結果
     */
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

    /**
     * 移除購物車項目
     * @param {string|number} cartId 購物車項目ID
     * @returns {Promise<object>} API 回傳結果
     */
    async removeCartItem(cartId) {
      const response = await axios.delete(`/api/${import.meta.env.VITE_APP_PATH}/cart/${cartId}`)
      if (response.data.success) {
        await this.getCart()
      }
      return response.data
    },

    /**
     * 清空購物車
     * @returns {Promise<object>} API 回傳結果
     */
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

    /**
     * 刷新購物車資料
     * @returns {Promise<object>} 最新購物車資料
     */
    async refreshCart() {
      return await this.getCart()
    },

    /**
     * 建立訂單並清空購物車
     * @param {object} orderData 訂單資料
     * @returns {Promise<object>} 回傳訂單建立結果
     */
    async createOrder(orderData) {
      if (!this.cart.carts?.length) {
        throw new Error('購物車內無商品')
      }

      if (this.cart.final_total <= this.validationRules.minPurchaseAmount) {
        throw new Error(`訂單金額需大於 ${this.validationRules.minPurchaseAmount} 元`)
      }

      const stockErrors = this.cart.carts
        .map((item) => {
          const stock = parseInt(item.product?.unit || 0, 10)
          const validation = this.validateQuantity(item.qty, stock)
          return !validation.isValid ? `${item.product?.title || '未知商品'}: ${validation.message}` : null
        })
        .filter(Boolean)

      if (stockErrors.length > 0) {
        throw new Error(`庫存檢查失敗:\n${stockErrors.join('\n')}`)
      }

      const finalOrderData = {
        ...orderData,
        ...(this.cart.coupon.isApplied && { coupon_code: this.cart.coupon.code }),
      }

      const { data } = await axios.post(`/api/${import.meta.env.VITE_APP_PATH}/order`, {
        data: finalOrderData,
      })

      if (!data?.success) {
        throw new Error(data?.message || '建立訂單失敗')
      }

      await this.clearCart()
      return {
        success: true,
        orderId: data.orderId,
        message: '訂單建立成功',
      }
    },

    /**
     * 移除購物車項目的部分數量
     * @param {string|number} cartId 購物車項目ID
     * @param {number|string} productId 產品ID
     * @param {number} removeQty 要移除的數量
     * @returns {Promise<object>} API 回傳結果或移除項目結果
     */
    async removeItemQuantity(cartId, productId, removeQty) {
      const cartItem = this.cart.carts.find((item) => item.id === cartId)
      if (!cartItem?.product) {
        throw new Error('找不到購物車項目')
      }

      const newQty = cartItem.qty - removeQty
      const stock = cartItem.product?.unit || 0

      if (newQty <= 0) {
        return this.removeCartItem(cartId)
      }

      const validation = this.validateQuantity(newQty, stock)
      if (!validation.isValid) {
        throw new Error(validation.message)
      }

      return this.updateCart(cartId, productId, newQty)
    },

    /**
     * 套用優惠券並計算折扣金額
     * @param {string} code 優惠券代碼
     * @returns {Promise<object>} 回傳套用結果
     */
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

    /**
     * 清除優惠券資料
     */
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

    /**
     * 清除購物車資料並刷新購物車
     */
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
