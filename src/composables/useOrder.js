/**
 * @module useOrder
 * @description 處理訂單相關的邏輯與狀態管理，包含訂單載入、優惠券處理和金額計算
 */

import { ref } from 'vue'
import { useOrderStore } from '@/stores/order'
import { useCartStore } from '@/stores/cartStore'

/**
 * @function useOrder
 * @description 訂單相關的組合式函數
 * @returns {Object} 訂單相關的狀態和方法
 */
export function useOrder() {
  const orderStore = useOrderStore()
  const cartStore = useCartStore()
  const order = ref(null)
  const isLoading = ref(false)

  /**
   * @function processProducts
   * @description 處理訂單商品數據，計算每項商品總價
   * @param {Array|Object} products - 訂單商品數據
   * @returns {Array} 處理後的商品數組
   */
  const processProducts = (products) => {
    if (!products) return []
    if (Array.isArray(products)) {
      return products.map((item) => ({
        ...item,
        total: (item.product?.price || 0) * (item.qty || 0)
      }))
    }
    return Object.entries(products).map(([id, item]) => ({
      id,
      ...item,
      total: (item.product?.price || 0) * (item.qty || 0)
    }))
  }

  /**
   * @function calculateTotal
   * @description 計算訂單總金額
   * @param {Array} products - 商品數組
   * @returns {number} 計算後的總金額
   */
  const calculateTotal = (products) => {
    return products.reduce((sum, item) => {
      const price = item.product?.price || 0
      const qty = item.qty || 0
      return sum + (price * qty)
    }, 0)
  }

  /**
   * @function getOrder
   * @description 獲取和處理訂單詳細信息
   * @param {string} orderId - 訂單ID
   * @throws {Error} 當加載訂單失敗時拋出錯誤
   * @important 訂單優惠邏輯處理順序：
   * 1. 優先使用訂單原始優惠券
   * 2. 其次使用購物車暫存的優惠券
   * 3. 最後才是無優惠的情況
   */
  const getOrder = async (orderId) => {
    isLoading.value = true
    try {
      const result = await orderStore.getOrderById(orderId)
      const processedProducts = processProducts(result.products)
      const calculatedTotal = calculateTotal(processedProducts)

      // 優惠券處理邏輯
      const savedCoupon = JSON.parse(localStorage.getItem('cart-coupon') || '{}')
      const cartCoupon = savedCoupon.isApplied ? savedCoupon : cartStore.cart.coupon

      let finalTotal = result.final_total || calculatedTotal
      let discount = 0

      // 優惠券邏輯處理
      if (result.coupon_code) {
        finalTotal = result.final_total
        discount = calculatedTotal - finalTotal
      } else if (cartCoupon.isApplied && cartCoupon.previewDiscount > 0) {
        discount = cartCoupon.previewDiscount
        finalTotal = calculatedTotal - discount
      } else {
        finalTotal = calculatedTotal
      }

      // 金額安全檢查
      if (finalTotal < 0) finalTotal = 0
      if (discount > calculatedTotal) discount = calculatedTotal

      order.value = {
        ...result,
        products: processedProducts,
        total: calculatedTotal,
        final_total: finalTotal,
        discount: discount,
        coupon_code: result.coupon_code || cartCoupon.code,
        user: formatUser(result.user),
      }
    } catch (error) {
      console.error('載入訂單失敗:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * @function formatUser
   * @description 格式化用戶信息
   * @param {Object} user - 用戶信息對象
   * @returns {Object} 格式化後的用戶信息
   */
  const formatUser = (user) => user || {}

  /**
   * @function formatPrice
   * @description 格式化價格顯示
   * @param {number} price - 價格數值
   * @returns {string} 格式化後的價格字符串
   */
  const formatPrice = (price) => Number(price).toLocaleString()

  return {
    order,
    isLoading,
    getOrder,
    formatPrice
  }
}
