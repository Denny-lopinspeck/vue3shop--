<template>
  <button class="btn btn-danger" @click="cancelOrder" :disabled="isLoading">取消訂單</button>
</template>

<script>
import { useCartStore } from '@/stores/cartStore'
import { STORAGE_KEYS, MESSAGES } from '@/constants/checkout'

export default {
  props: {
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['loading'],

  setup() {
    const cartStore = useCartStore()
    return { cartStore }
  },

  methods: {
    clearStorage() {
      localStorage.removeItem(STORAGE_KEYS.ORDER)
      localStorage.removeItem(STORAGE_KEYS.COUPON)
    },

    async cancelOrder() {
      if (!window.confirm(MESSAGES.CANCEL_CONFIRM)) return

      this.$emit('loading', true)
      try {
        this.clearStorage()
        this.cartStore.clearCouponData()
        await this.cartStore.refreshCart()
        this.$toast?.success(MESSAGES.ORDER_CANCEL)
        this.$router.push('/cart')
      } catch (error) {
        this.$toast?.error(error.message || '取消訂單失敗')
      } finally {
        this.$emit('loading', false)
      }
    }
  }
}
</script>
