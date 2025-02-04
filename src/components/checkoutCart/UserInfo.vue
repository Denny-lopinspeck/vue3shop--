<template>
  <div class="card">
    <div class="card-header">
      <h5 class="mb-0">收件資訊</h5>
    </div>
    <div class="card-body">
      <table class="table">
        <tbody>
          <tr>
            <th>訂單編號</th>
            <td>{{ order.id }}</td>
          </tr>
          <tr v-for="(value, key) in userInfo" :key="key">
            <th>{{ labels[key] }}</th>
            <td>{{ value }}</td>
          </tr>
          <tr>
            <th>留言</th>
            <td>{{ order.message }}</td>
          </tr>
        </tbody>
      </table>

      <div class="text-end">
        <div class="btn-group">
          <button
            class="btn btn-outline-danger"
            @click="cancelOrder"
            :disabled="isLoading"
          >
            取消訂單
          </button>
          <button
            class="btn btn-danger"
            @click="handlePaymentClick"
            :disabled="order.is_paid || isLoading"
          >
            {{ btnText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useCartStore } from '@/stores/cartStore'
import { STORAGE_KEYS, MESSAGES } from '@/constants/checkout'



 //顯示用戶訂單資料

export default {
  name: 'UserInfo',
  props: {
    order: {
      type: Object,
      required: true
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const cartStore = useCartStore()
    return { cartStore }
  },
  computed: {
    userInfo() {
      return {
        name: this.order.user.name,
        email: this.order.user.email,
        tel: this.order.user.tel,
        address: this.order.user.address
      }
    },
    labels() {
      return {
        name: '姓名',
        email: 'Email',
        tel: '電話',
        address: '地址'
      }
    },
    btnText() {
      if (this.isLoading) return '處理中...'
      return this.order.is_paid ? '已完成付款' : '確認付款'
    }
  },
  methods: {

    //處理支付按鈕點擊事件

    handlePaymentClick() {
      this.$emit('payment')
    },

    clearStorage() {
      localStorage.removeItem(STORAGE_KEYS.ORDER)
      localStorage.removeItem(STORAGE_KEYS.COUPON)
    },

    //取消訂單並清除相關數據

    async cancelOrder() {
      if (!window.confirm(MESSAGES.CANCEL_CONFIRM)) return

      this.$emit('loading', true)
      try {
        this.clearStorage()
        await this.cartStore.clearCouponData()
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

<style scoped>
.btn-group {
  gap: 0.5rem;
}

.btn-group .btn {
  border-radius: 4px !important;
}
</style>
