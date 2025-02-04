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
          @loading="handleLoading"
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
import { useOrderStore } from '@/stores/order'
import OrderDetails from '@/components/checkoutCart/OrderDetails.vue'
import UserInfo from '@/components/checkoutCart/UserInfo.vue'
import { STORAGE_KEYS, MESSAGES } from '@/constants/checkout'

export default {
  name: 'CheckOutView',
  components: {
    OrderDetails,
    UserInfo
  },

  data() {
    return {
      paymentSuccess: false,
    }
  },

  setup() {
    const cartStore = useCartStore()
    const orderStore = useOrderStore()
    const { order, isLoading, getOrder } = useOrder()

    return {
      order,
      isLoading,
      getOrder,
      cartStore,
      orderStore
    }
  },

  created() {
    this.initializeOrder()
  },

  beforeRouteLeave(to, from, next) {
    if (this.paymentSuccess || to.path.includes('/cart')) {
      next()
      return
    }

    if (this.order && !this.order.is_paid) {
      const confirm = window.confirm(MESSAGES.LEAVE_CONFIRM)
      if (confirm) {
        this.saveOrderToStorage()
        next()
      } else {
        next(false)
        return
      }
    } else {
      next()
    }
  },

  methods: {
    saveOrderToStorage() {
      localStorage.setItem(STORAGE_KEYS.ORDER, JSON.stringify(this.order))
    },

    clearStorage() {
      localStorage.removeItem(STORAGE_KEYS.ORDER)
      localStorage.removeItem(STORAGE_KEYS.COUPON)
    },

    async handleLoading(callback) {
      this.isLoading = true
      try {
        await callback()
      } catch (error) {
        this.$toast?.error(error.message || MESSAGES.PAYMENT_FAIL)
      } finally {
        this.isLoading = false
      }
    },

    // 從本地存儲或API初始化訂單
    async initializeOrder() {
      const savedOrder = localStorage.getItem(STORAGE_KEYS.ORDER)
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder)
        if (!parsedOrder.is_paid) {
          this.order = parsedOrder
          return
        }
        localStorage.removeItem(STORAGE_KEYS.ORDER)
      }

      const orderId = this.$route.params.orderId
      if (orderId) {
        await this.getOrder(orderId)
      }
    },

    // 處理訂單支付和後續流程
    async handlePayment() {
      if (!this.order?.id) {
        this.$toast?.error(MESSAGES.INVALID_ORDER)
        return
      }

      if (this.isLoading || this.order.is_paid) return

      await this.handleLoading(async () => {
        const result = await this.orderStore.payOrder(this.order.id)
        if (result.success) {
          const discountMessage = this.order.discount
            ? `使用${this.couponDisplayName}折抵 ${this.order.discount} 元`
            : '未使用優惠券'

          this.paymentSuccess = true
          this.$toast?.success(`${MESSAGES.PAYMENT_SUCCESS}${discountMessage}`)
          this.order = result.order
          await this.cartStore.getCart()
          this.clearStorage()

          setTimeout(() => {
            this.$router.push('/user-products')
          }, 1800)
        }
      })
    },

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
