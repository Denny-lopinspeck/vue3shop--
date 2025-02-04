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
    </div>
  </div>
  <div class="text-end">
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
    <PaginationComponent
      :data-length="store.orders.length"
      :on-page-change="changePage"
    />
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

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import OrderModal from '@/components/OrderModal.vue'
import { useOrdersStore } from '@/stores/orderStore'
import { usePagination } from '@/composables/usePagination'
import * as bootstrap from 'bootstrap'

// 初始化狀態管理和參考
const store = useOrdersStore()
const orderModal = ref(null)
const isLoading = ref(false)
const toastMessage = ref('')
const toastType = ref('')
const toast = ref(null)

// 分頁相關設定
const {
  currentPage,
  changePage,
  PaginationComponent
} = usePagination()

const itemsPerPage = 5

// 計算分頁後的訂單資料
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return store.orders.slice(start, end)
})

// 格式化工具函數
const formatPrice = (price) => `NT$ ${price.toLocaleString()}`
const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString()

// 刪除所有訂單功能
const deleteAllOrders = async () => {
  try {
    if (confirm('確定要刪除全部訂單嗎？此動作無法復原！')) {
      const res = await store.deleteAllOrders()
      if (res.success) {
        showToast('已刪除全部訂單', 'bg-success')
      }
    }
  } catch (error) {
    showToast(error.message || '刪除失敗', 'bg-danger')
  }
}

// Toast 通知系統
const showToast = (message, type) => {
  toastMessage.value = message
  toastType.value = type
  const toastEl = toast.value
  const bsToast = new bootstrap.Toast(toastEl)
  bsToast.show()
}

// 初始化訂單資料
const initOrders = async () => {
  isLoading.value = true
  try {
    await store.getOrders()
  } finally {
    isLoading.value = false
  }
}

// 開啟訂單詳細資料 Modal
const openModal = (order) => {
  orderModal.value.openModal(order)
}

// 生命週期鉤子
onMounted(() => {
  initOrders()
})

// 清理 Bootstrap Toast 實例
onBeforeUnmount(() => {
  const toastEl = toast.value
  if (toastEl) {
    const bsToast = bootstrap.Toast.getInstance(toastEl)
    if (bsToast) {
      bsToast.dispose()
    }
  }
})
</script>

<style>
.toast {
  z-index: 9999;
}
</style>
