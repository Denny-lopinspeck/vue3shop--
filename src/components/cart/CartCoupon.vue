<template>
  <div class="mt-4">
    <div class="card">
      <div class="card-body">
        <h3 class="mb-3">優惠券</h3>
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            placeholder="輸入優惠券代碼"
            v-model="couponCode"
            @keyup.enter="submitCoupon"
          >
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="submitCoupon"
            :disabled="isLoading || !couponCode"
          >
            套用優惠券
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 優惠券輸入表單元件
 * 負責處理優惠券代碼的輸入和驗證
 * 並將優惠券代碼傳遞給父元件進行處理
 */
export default {
  name: 'CouponForm',
  props: {
    /**
     * 是否正在處理中
     * @type {boolean}
     */
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      /**
       * 優惠券代碼
       * @type {string}
       */
      couponCode: ''
    }
  },
  methods: {
    /**
     * 處理優惠券套用事件
     * 清空輸入欄位並發送優惠券代碼到父元件
     * @emits apply-coupon - 觸發優惠券套用事件，傳遞優惠券代碼
     */
    submitCoupon() {
      if (!this.couponCode) return
      this.$emit('apply-coupon', this.couponCode)
      this.couponCode = ''
    }
  }
}
</script>
