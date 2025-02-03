<template>
  <div class="modal fade" id="orderModal" tabindex="-1" ref="modal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">訂單詳情</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <!-- 判斷是否有訂單資料 -->
        <div class="modal-body" v-if="currentOrder">
          <div class="row mb-3">
            <div class="col-md-6">
              <p><strong>訂單編號：</strong> {{ currentOrder.num }}</p>
              <p><strong>下單時間：</strong> {{ formatDate(currentOrder.create_at) }}</p>
              <p><strong>付款狀態：</strong> {{ currentOrder.is_paid ? '已付款' : '未付款' }}</p>
              <p v-if="currentOrder.paid_date">
                <strong>付款時間：</strong> {{ formatDate(currentOrder.paid_date) }}
              </p>
            </div>
            <div class="col-md-6">
              <p><strong>購買者：</strong> {{ currentOrder.user?.name }}</p>
              <p><strong>Email：</strong> {{ currentOrder.user?.email }}</p>
              <p><strong>電話：</strong> {{ currentOrder.user?.tel }}</p>
              <p><strong>地址：</strong> {{ currentOrder.user?.address }}</p>
            </div>
          </div>
          <hr>
          <!-- 修改優惠券資訊區塊 -->
          <div v-if="currentOrder.coupon" class="mb-3 bg-light p-3 rounded">
            <h6 class="mb-3">優惠券資訊</h6>
            <div class="row">
              <div class="col-md-6">
                <p class="mb-1"><strong>優惠券名稱：</strong>{{ currentOrder.coupon.title || '未命名優惠券' }}</p>
                <p class="mb-1"><strong>優惠碼：</strong>{{ currentOrder.coupon.code }}</p>
              </div>
              <div class="col-md-6">
                <p class="mb-1"><strong>折扣比例：</strong>{{ currentOrder.coupon.percent }}%</p>
                <p class="mb-1"><strong>折扣金額：</strong>{{ formatPrice(currentOrder.couponDiscount) }}</p>
              </div>
            </div>
          </div>
          <!-- 購買商品列表 -->
          <h6 class="mt-4">購買商品</h6>
          <table class="table align-middle">
            <thead>
              <tr>
                <th>品名</th>
                <th width="100" class="text-end">單價</th>
                <th width="100" class="text-center">數量</th>
                <th width="100" class="text-end">小計</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in orderProducts" :key="item.id">
                <td>{{ item.title }}</td>
                <td class="text-end">{{ formatPrice(item.price) }}</td>
                <td class="text-center">{{ item.qty }}</td>
                <td class="text-end">{{ formatPrice(item.price * item.qty) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-end">商品總計</td>
                <td class="text-end">{{ formatPrice(currentOrder.total) }}</td>
              </tr>
              <tr v-if="currentOrder.couponDiscount">
                <td colspan="3" class="text-end text-danger">優惠券折扣</td>
                <td class="text-end text-danger">- {{ formatPrice(currentOrder.couponDiscount) }}</td>
              </tr>
            </tfoot>
          </table>
          <p class="mt-4"><strong>留言：</strong> {{ currentOrder.message }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger me-2" @click="deleteOrderItem">
            刪除訂單
          </button>
          <button
            type="button"
            class="btn"
            :class="currentOrder.is_paid ? 'btn-danger' : 'btn-primary'"
            @click="togglePaidStatus"
          >
            {{ currentOrder.is_paid ? '標記為未付款' : '標記為已付款' }}
          </button>
          <button type="button" class="btn btn-secondary" @click="closeModal">關閉</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import { useOrdersStore } from '@/stores/orderStore'

export default {
  name: 'OrderModal',
  emits: ['update-success', 'update-error'],
  data() {
    return {
      modal: null,
      tempOrder: {},
      store: useOrdersStore(),
      currentOrder: {
        id: '',
        num: '',
        create_at: '',
        is_paid: false,
        paid_date: null,
        total: 0,
        couponDiscount: 0,
        message: '',
        user: {
          name: '',
          email: '',
          tel: '',
          address: ''
        },
        products: [],
        coupon: {
          code: '',
          title: '',
          percent: 0,
          due_date: null
        }
      }
    }
  },
  computed: {
    orderProducts() {
      if (!this.currentOrder || !this.currentOrder.products) return []
      return Object.entries(this.currentOrder.products).map(([key, item]) => {
        const price = item.price || item.product?.price || 0
        return {
          id: key,
          title: item.product?.title || item.title || '未命名商品',
          price,
          qty: item.qty || 0
        }
      })
    }
  },
  methods: {
    /**
     * 格式化 UNIX 時間戳為日期字串
     * @param {number} timestamp UNIX 時間戳
     * @returns {string} 日期字串
     */
    formatDate(timestamp) {
      return new Date(timestamp * 1000).toLocaleDateString()
    },

    /**
     * 顯示訂單詳情 Modal
     * @param {Object} item 訂單資料
     */
    showModal(item) {
      this.tempOrder = { ...item }
      this.modal.show()
    },

    /**
     * 切換訂單付款狀態
     */
    async togglePaidStatus() {
      const { currentOrder } = this
      try {
        const updatedOrder = {
          ...currentOrder,
          is_paid: !currentOrder.is_paid,
          paid_date: !currentOrder.is_paid ? Math.floor(Date.now() / 1000) : null,
        }
        const res = await this.store.updateOrder(currentOrder.id, updatedOrder)
        if (res.success) {
          this.hideModal()
          this.$emit('update-success', `訂單${currentOrder.is_paid ? '取消付款' : '付款'}成功`)
        }
      } catch (error) {
        this.$emit('update-error', error.message || '更新失敗')
      }
    },

    /**
     * 刪除訂單
     */
    async deleteOrderItem() {
      try {
        if (confirm('確定要刪除此訂單嗎？')) {
          const res = await this.store.deleteOrder(this.currentOrder.id)
          if (res.success) {
            this.hideModal()
            this.$emit('update-success', res.message)
          }
        }
      } catch (error) {
        this.$emit('update-error', error.message || '刪除失敗')
      }
    },

    /**
     * 隱藏訂單詳情 Modal
     */
    hideModal() {
      this.modal.hide()
    },

    /**
     * 開啟訂單詳情 Modal 並同步訂單資料
     * @param {Object} order 訂單資料
     */
    openModal(order) {
      // 將後端回傳的訂單資料與預設值合併
      this.currentOrder = {
        ...this.currentOrder,
        ...order,
        products: order.products || {},
        user: { ...order.user },
        coupon: order.coupon || null,  // 若有優惠券資料則同步
        couponDiscount: order.coupon_discount || 0
      }

      if (!this.modal) {
        this.modal = new Modal(this.$refs.modal)
      }
      this.modal.show()
    },

    /**
     * 關閉 Modal 並重置訂單資料
     */
    closeModal() {
      if (this.modal) {
        this.modal.hide()
        // 重置訂單資料
        this.currentOrder = {
          id: '',
          num: '',
          create_at: '',
          is_paid: false,
          paid_date: null,
          total: 0,
          final_total: 0,
          couponDiscount: 0,
          message: '',
          user: {
            name: '',
            email: '',
            tel: '',
            address: ''
          },
          products: [],
          coupon: {
            code: '',
            title: '',
            percent: 0,
            due_date: null
          }
        }
      }
    },

    /**
     * 格式化價格字串
     * @param {number} price
     * @returns {string} 格式化後的價格字串
     */
    formatPrice(price) {
      return `NT$ ${Number(price).toLocaleString()}`
    }
  },
  mounted() {
    this.modal = new Modal(this.$refs.modal)
  },
  beforeUnmount() {
    if (this.modal) {
      this.modal.dispose()
    }
  }
}
</script>

<style scoped>
.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
