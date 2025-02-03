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
            @click="$emit('cancel')"
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
/**
 * @component UserInfo
 * @description 顯示用戶訂單信息的組件
 * @emits payment - 當用戶點擊支付按鈕時觸發
 * @emits cancel - 當用戶點擊取消按鈕時觸發
 */
export default {
  name: 'UserInfo',
  props: {
    /**
     * @prop {Object} order - 訂單信息
     * @required
     */
    order: {
      type: Object,
      required: true
    },
    /**
     * @prop {Boolean} isLoading - 加載狀態
     */
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    /**
     * @computed userInfo
     * @description 格式化用戶信息對象
     * @returns {Object} 用戶基本信息
     */
    userInfo() {
      return {
        name: this.order.user.name,
        email: this.order.user.email,
        tel: this.order.user.tel,
        address: this.order.user.address
      }
    },

    /**
     * @computed labels
     * @description 用戶信息字段標籤
     * @returns {Object} 字段對應的顯示標籤
     */
    labels() {
      return {
        name: '姓名',
        email: 'Email',
        tel: '電話',
        address: '地址'
      }
    },

    /**
     * @computed btnText
     * @description 支付按鈕文字
     * @returns {string} 按鈕顯示文字
     */
    btnText() {
      if (this.isLoading) return '處理中...'
      return this.order.is_paid ? '已完成付款' : '確認付款'
    }
  },
  methods: {
    /**
     * @method handlePaymentClick
     * @description 處理支付按鈕點擊事件
     */
    handlePaymentClick() {
      console.log('支付按鈕被點擊')
      console.log('訂單狀態:', {
        orderId: this.order.id,
        isPaid: this.order.is_paid,
        isLoading: this.isLoading
      })
      this.$emit('payment')
    }
  }
}
</script>

<style scoped>
.btn-group {
  gap: 0.5rem;
}
</style>
