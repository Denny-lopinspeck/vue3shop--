<template>
  <div class="checkout-view container">
    <div class="my-5 row justify-content-center">
      <div class="col-md-6" v-if="order">
        <!-- 結合訂單摘要與訂單明細 -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">訂單明細與摘要</h5>
            <span class="badge" :class="order.is_paid ? 'bg-success' : 'bg-warning'">
              {{ order.is_paid ? '已付款' : '未付款' }}
            </span>
          </div>
          <div class="card-body">
            <table class="table align-middle">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>數量</th>
                  <th class="text-end">小計</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in order.products" :key="item.id">
                  <td>{{ item.product?.title || '商品已不存在' }}</td>
                  <td>{{ item.qty }}</td>
                  <td class="text-end">NT$ {{ item.total?.toLocaleString() || 0 }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr v-if="order.discount > 0">
                  <td colspan="2" class="text-end text-success">優惠折扣</td>
                  <td class="text-end text-success">-NT$ {{ formatPrice(order.discount) }}</td>
                </tr>
                <tr>
                  <td colspan="2" class="text-end fw-bold">結帳金額</td>
                  <td class="text-end fw-bold">NT$ {{ formatPrice(order.final_total) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
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
                <tr>
                  <th>姓名</th>
                  <td>{{ order.user.name }}</td>
                </tr>
                <tr>
                  <th>Email</th>
                  <td>{{ order.user.email }}</td>
                </tr>
                <tr>
                  <th>電話</th>
                  <td>{{ order.user.tel }}</td>
                </tr>
                <tr>
                  <th>地址</th>
                  <td>{{ order.user.address }}</td>
                </tr>
                <tr>
                  <th>留言</th>
                  <td>{{ order.message }}</td>
                </tr>
              </tbody>
            </table>

            <div class="text-end">
              <button
                class="btn btn-danger"
                @click="handlePayment"
                :disabled="order.is_paid || isLoading"
              >
                {{ isLoading ? '處理中...' : order.is_paid ? '已完成付款' : '確認付款' }}
              </button>
            </div>
          </div>
        </div>
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
import { useOrderStore } from '@/stores/order'
import { useCartStore } from '@/stores/cartStore'

export default {
  name: 'CheckOutView',

  data() {
    return {
      orderStore: useOrderStore(),
      cartStore: useCartStore(),
      order: null,
      isLoading: false,
    }
  },

  computed: {
    originalTotal() {
      return this.cartStore.displayTotal
    },
    discount() {
      return this.cartStore.displayDiscount
    },
    finalTotal() {
      return this.cartStore.displayFinalTotal
    },
  },

  async created() {
    window.addEventListener('beforeunload', this.saveOrderToStorage)
    const orderId = this.$route.params.orderId
    const savedOrder = localStorage.getItem('checkout-order')
    if (savedOrder) {
      const order = JSON.parse(savedOrder)
      if (!order.is_paid) {
        this.order = order
        return
      } else {
        localStorage.removeItem('checkout-order')
      }
    }
    if (orderId) {
      await this.getOrder(orderId)
    }
  },

  beforeUnmount() {
    window.removeEventListener('beforeunload', this.saveOrderToStorage)
  },

  methods: {
    /**
     * 處理商品資料，計算每個商品的總價
     * @param {Object|Array} products - 訂單中的商品資料，可能為物件或陣列
     * @returns {Array} 處理後的商品資料（含小計）
     */
    processProducts(products) {
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
    },

    /**
     * 根據訂單ID獲取訂單詳細資訊
     * @param {String} orderId - 訂單ID
     * @description 取得訂單並進行資料處理
     */
    async getOrder(orderId) {
      this.isLoading = true
      try {
        const result = await this.orderStore.getOrderById(orderId)

        const processedProducts = this.processProducts(result.products)
        const calculatedTotal = this.calculateTotal(processedProducts)
        let finalTotal = result.final_total ? result.final_total : calculatedTotal
        let discount = calculatedTotal - finalTotal

        // 若訂單中無優惠券資料，但購物車有應用優惠券且有折扣預覽，則套用購物車的優惠券折扣
        if (!result.coupon_code && this.cartStore.cart.coupon.isApplied && this.cartStore.cart.coupon.previewDiscount > 0) {
          discount = this.cartStore.cart.coupon.previewDiscount
          finalTotal = calculatedTotal - discount
        }

        this.order = {
          ...result,
          products: processedProducts,
          total: calculatedTotal,
          final_total: finalTotal,
          discount: discount,
          user: this.formatUser(result.user),
        }
      } catch (error) {
        console.error('載入訂單失敗:', error)
        this.$toast?.error('載入訂單失敗')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 計算商品總金額
     * @param {Array} products - 處理後的商品資料
     * @returns {Number} 商品總金額
     */
    calculateTotal(products) {
      return products.reduce((sum, item) => {
        const price = item.product?.price || 0
        const qty = item.qty || 0
        return sum + (price * qty)
      }, 0)
    },

    /**
     * 處理付款流程
     * @description 進行付款請求，更新購物車與訂單狀態
     */
    async handlePayment() {
      if (!this.order?.id) {
        this.$toast?.error('無效的訂單')
        return
      }

      if (this.isLoading) {
        return
      }

      if (this.order.is_paid) {
        this.$toast?.error('此訂單已完成付款')
        return
      }

      this.isLoading = true

      try {
        const result = await this.orderStore.payOrder(this.order.id)

        if (result.success) {
          this.$toast?.success('付款成功！')

          // 更新訂單狀態
          this.order = result.order

          // 更新購物車
          await this.cartStore.getCart()

          // 清除本地存儲
          this.clearOrderStorage()

          // 延遲導航
          setTimeout(() => {
            this.$router.push('/user-products')
          }, 1500)
        }
      } catch (error) {
        console.error('付款處理失敗:', error)
        this.$toast?.error(error.message || '付款失敗，請稍後再試')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 格式化價格顯示
     * @param {Number} price - 價格
     * @returns {String} 格式化後的價格
     */
    formatPrice(price) {
      return Number(price).toLocaleString()
    },

    // 新增保存未結帳資料的方法
    saveOrderToStorage() {
      if (this.order && !this.order.is_paid) {
        localStorage.setItem('checkout-order', JSON.stringify(this.order))
      }
    },

    // 新增清除保存資料的方法
    clearOrderStorage() {
      localStorage.removeItem('checkout-order')
    },

    formatUser(user) {
      if (!user) return {}
      return user
    }
  }
}
</script>

<style scoped>
.checkout-view {
  margin-top: 2rem;
}
.order-summary {
  margin-bottom: 2rem;
  text-align: left;
}
.card {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.badge {
  padding: 0.5em 1em;
}
</style>
