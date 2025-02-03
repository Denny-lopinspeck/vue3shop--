<template>
  <div class="checkout-view container">
    <div class="my-5 row justify-content-center">
      <div class="col-md-6" v-if="order">
        <h2 class="h4 mb-3">結帳資訊</h2>
        <OrderDetails :order="order" />
        <UserInfo
          :order="order"
          :isLoading="isLoading"
          @payment="handlePayment"
          @cancel="cancelOrder"
        />
      </div>
      <div v-else class="col-md-6 text-center">
        <div class="spinner-border" role="status" v-if="isLoading">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useOrder } from '@/composables/useOrder'
import { useCartStore } from '@/stores/cartStore'
import { useOrderStore } from '@/stores/order'  // 新增這行
import OrderDetails from '@/components/checkoutCart/OrderDetails.vue'
import UserInfo from '@/components/checkoutCart/UserInfo.vue'

/**
 * @component CheckOutView
 * @description 結帳頁面視圖組件，整合訂單詳情和用戶信息
 */
export default {
  name: 'CheckOutView',
  components: {
    OrderDetails,
    UserInfo
  },

  setup() {
    const cartStore = useCartStore()
    const orderStore = useOrderStore()  // 新增這行
    const { order, isLoading, getOrder } = useOrder()

    return {
      order,
      isLoading,
      getOrder,
      cartStore,
      orderStore  // 新增這行
    }
  },

  created() {
    this.initializeOrder()
  },

  /**
   * @description 路由離開守衛
   * @important 只在非取消訂單的情況下保存訂單狀態
   */
  beforeRouteLeave(to, from, next) {
    // 只在使用者直接離開或重整頁面時保存訂單
    if (this.order && !this.order.is_paid && !to.path.includes('/cart')) {
      const confirm = window.confirm('您尚未完成付款，確定要離開嗎？離開後將保存訂單資訊。')
      if (confirm) {
        localStorage.setItem('checkout-order', JSON.stringify(this.order))
      } else {
        return next(false)
      }
    }
    next()
  },

  methods: {
    /**
     * @method initializeOrder
     * @description 初始化訂單數據，優先從本地存儲讀取，否則從API獲取
     * @async
     */
    async initializeOrder() {
      const savedOrder = localStorage.getItem('checkout-order')
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder)
        if (!parsedOrder.is_paid) {
          this.order = parsedOrder
          return
        }
        localStorage.removeItem('checkout-order')
      }

      const orderId = this.$route.params.orderId
      if (orderId) {
        await this.getOrder(orderId)
      }
    },

    /**
     * @method handlePayment
     * @description 處理訂單支付邏輯
     * @async
     * @important 支付流程：
     * 1. 驗證訂單有效性
     * 2. 處理支付請求
     * 3. 更新購物車狀態
     * 4. 清理本地存儲
     * 5. 導航至訂單完成頁面
     */
    async handlePayment() {
      if (!this.order?.id) {
        this.$toast?.error('無效的訂單')
        return
      }

      if (this.isLoading || this.order.is_paid) {
        return
      }

      this.isLoading = true

      try {
        const result = await this.orderStore.payOrder(this.order.id)
        if (result.success) {
          this.$toast?.success('付款成功！')
          this.order = result.order
          await this.cartStore.getCart()
          localStorage.removeItem('checkout-order')

          setTimeout(() => {
            this.$router.push('/user-products')
          }, 1500)
        }
      } catch (error) {
        this.$toast?.error(error.message || '付款失敗，請稍後再試')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * @method cancelOrder
     * @description 取消訂單並清除所有相關資料
     * @async
     * @important 取消訂單流程：
     * 1. 清除本地存儲
     * 2. 清除優惠券資料
     * 3. 更新購物車狀態
     * 4. 導回購物車頁面
     */
    async cancelOrder() {
      if (!window.confirm('確定要取消訂單嗎？此操作將清除所有訂單資料且無法復原。')) {
        return
      }

      try {
        this.isLoading = true

        // 清除本地存儲的所有訂單相關資料
        localStorage.removeItem('checkout-order')
        localStorage.removeItem('cart-coupon')

        // 清除購物車的優惠券資料
        await this.cartStore.clearCouponData()

        // 刷新購物車資料
        await this.cartStore.refreshCart()

        this.$toast?.success('訂單已取消')

        // 直接導向購物車頁面
        this.$router.push('/cart')
      } catch (error) {
        console.error('取消訂單失敗:', error)
        this.$toast?.error('取消訂單失敗')
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
.checkout-view {
  margin-top: 2rem;
}
.card {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>
