<template>
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h3 class="mb-0">訂單管理</h3>
    <div>
      <button
        class="btn btn-danger btn-sm me-2"
        @click="deleteAllOrders"
        v-if="store.orders.length > 0"
      >
        刪除全部訂單
      </button>
      <button class="btn btn-outline-secondary btn-sm" @click="toggleTestMode">
        {{ store.isTestMode ? '切換正式模式' : '切換測試模式' }}
      </button>
    </div>
  </div>
  <div class="text-end">
    <h3 class="text-center mb-4">訂單管理</h3>
  </div>
  <div v-if="isLoading" class="text-center mt-5">
    <div class="spinner-border" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
  <table v-else class="table mt-4 container-fluid align-middle">
    <thead>
      <tr>
        <th width="120">訂單編號</th>
        <th>購買者</th>
        <th width="120" class="text-end">總金額</th>
        <th width="120" class="text-center">付款狀態</th>
        <th width="120" class="text-center">建立時間</th>
        <th width="200" class="text-center">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in paginatedOrders" :key="item.id">
        <td>{{ item.num }}</td>
        <td>{{ item.user.name }}</td>
        <td class="text-end">{{ formatPrice(item.total) }}</td>
        <td class="text-center">
          <span :class="{ 'text-success': item.is_paid }">
            {{ item.is_paid ? '已付款' : '未付款' }}
          </span>
        </td>
        <td class="text-center">{{ formatDate(item.create_at) }}</td>
        <td class="text-center">
          <button class="btn btn-outline-primary btn-sm" @click="openModal(item)">查看</button>
        </td>
      </tr>
    </tbody>
  </table>
  <nav v-if="paginatedOrders.length > 0" aria-label="Page navigation" class="mt-4">
    <ul class="pagination justify-content-center">
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">上一頁</a>
      </li>
      <li
        v-for="page in totalPages"
        :key="page"
        class="page-item"
        :class="{ active: page === currentPage }"
      >
        <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
      </li>
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">下一頁</a>
      </li>
    </ul>
  </nav>
  <OrderModal
    ref="orderModal"
    @update-success="showToast('更新成功', 'bg-success')"
    @update-error="showToast($event, 'bg-danger')"
  ></OrderModal>

  <div class="toast-container position-fixed top-0 start-50 translate-middle-x pt-4">
    <div
      class="toast align-items-center text-white border-0"
      :class="toastType"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      ref="toast"
    >
      <div class="d-flex">
        <div class="toast-body text-center px-4">
          {{ toastMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import OrderModal from '@/components/OrderModal.vue'
import { useOrdersStore } from '@/stores/orderStore'
import * as bootstrap from 'bootstrap'

export default {
  name: 'OrdersView',
  components: {
    OrderModal,
  },
  data() {
    return {
      store: useOrdersStore(),
      isLoading: false,
      toastMessage: '',
      toastType: '',
      toast: null,
      currentPage: 1,
      itemsPerPage: 5,
    }
  },
  computed: {
    // 分頁後的訂單
    paginatedOrders() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.store.orders.slice(start, end)
    },
    // 總頁數
    totalPages() {
      return Math.max(1, Math.ceil(this.store.orders.length / this.itemsPerPage))
    },
  },
  methods: {
    /**
     * 格式化價格顯示.
     * @param {number} price - 需要格式化的價格數字.
     * @returns {string} 格式化後的價格字串.
     */
    formatPrice(price) {
      return `NT$ ${price.toLocaleString()}`
    },

    /**
     * 格式化日期顯示.
     * @param {number} timestamp - UNIX 時間戳記 (秒).
     * @returns {string} 格式化後的日期字串.
     */
    formatDate(timestamp) {
      return new Date(timestamp * 1000).toLocaleDateString()
    },

    /**
     * 切換測試/正式模式.
     */
    toggleTestMode() {
      this.store.toggleTestMode()
    },

    /**
     * 批量刪除所有訂單.
     * @returns {Promise<void>}
     */
    async deleteAllOrders() {
      try {
        if (confirm('確定要刪除全部訂單嗎？此動作無法復原！')) {
          const res = await this.store.deleteAllOrders()
          if (res.success) {
            this.showToast('已刪除全部訂單', 'bg-success')
          }
        }
      } catch (error) {
        this.showToast(error.message || '刪除失敗', 'bg-danger')
      }
    },

    /**
     * 切換頁面.
     * @param {number} page - 要切換到的頁碼.
     */
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
      }
    },

    /**
     * 顯示提示訊息.
     * @param {string} message - 提示訊息內容.
     */
    showToast(message, type) {
      this.toastMessage = message
      this.toastType = type
      const toastEl = this.$refs.toast
      const toast = new bootstrap.Toast(toastEl)
      toast.show()
    },

    /**
     * 初始化訂單資料.
     */
    async initOrders() {
      this.isLoading = true
      try {
        await this.store.getOrders()
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 開啟訂單詳情 Modal
     * @param {Object} order - 訂單資料
     */
    openModal(order) {
      this.$refs.orderModal.openModal(order)
    },
  },
  beforeUnmount() {
    if (this.toast) {
      this.toast.dispose()
    }
  },
  mounted() {
    this.initOrders()
  },
}
</script>

<style>
.toast {
  z-index: 9999;
}
</style>
