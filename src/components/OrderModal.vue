<template>
  <div class="modal fade" id="orderModal" tabindex="-1" ref="modalRef">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">訂單詳情</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
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

          <h6 class="mt-4">購買商品</h6>
          <table class="table align-middle">
            <thead>
              <tr>
                <th>品項</th>
                <th width="100" class="text-end">單價</th>
                <th width="100" class="text-center">數量</th>
                <th width="100" class="text-end">小計</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in orderProducts" :key="item.id">
                <!-- 商品主要資訊 -->
                <tr>
                  <td>
                    {{ item.title }}
                    <span v-if="item.couponTitle" class="badge bg-success ms-2">
                      {{ item.couponTitle }}
                    </span>
                  </td>
                  <td class="text-end">{{ formatPrice(item.price) }}</td>
                  <td class="text-center">{{ item.qty }}</td>
                  <td class="text-end">{{ formatPrice(item.price * item.qty) }}</td>
                </tr>
                <!-- 折扣計算明細 -->
                <tr v-if="item.discountPercent > 0" class="text-success" style="font-size: 0.9em;">
                  <td class="ps-4">
                    <i class="bi bi-arrow-return-right"></i>
                    折扣 {{ item.discountPercent }}%
                  </td>
                  <td class="text-end">
                    -{{ formatPrice(item.discountAmount) }}
                  </td>
                  <td class="text-center">× {{ item.qty }}</td>
                  <td class="text-end">
                    -{{ formatPrice(item.discountAmount * item.qty) }}
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-end">商品總計</td>
                <td class="text-end">{{ formatPrice(orderSubtotal) }}</td>
              </tr>
              <tr v-if="totalDiscount > 0">
                <td colspan="3" class="text-end text-success">
                  優惠折扣金額
                  <span v-if="currentOrder.coupon_code" class="badge bg-success">
                    {{ currentOrder.coupon_code }}
                  </span>
                </td>
                <td class="text-end text-success">
                  -{{ formatPrice(finalTotal) }}
                </td>
              </tr>
              <tr>
                <td colspan="3" class="text-end fw-bold">實付金額</td>
                <td class="text-end fw-bold">{{ formatPrice(totalDiscount) }}</td>
              </tr>
            </tfoot>
          </table>

          <div v-if="currentOrder.discount && currentOrder.discount > 0" class="mt-4 p-3 bg-light rounded">
            <h6 class="mb-3">優惠券資訊</h6>
            <div class="row">
              <div class="col-md-6">
                <p><strong>優惠券代碼：</strong> {{ currentOrder.coupon_code || '無代碼' }}</p>
                <p><strong>折扣金額：</strong> {{ formatPrice(currentOrder.discount) }}</p>
              </div>
              <div class="col-md-6">
                <p><strong>折扣前金額：</strong> {{ formatPrice(currentOrder.total) }}</p>
                <p><strong>折扣後金額：</strong> {{ formatPrice(currentOrder.final_total) }}</p>
              </div>
            </div>
          </div>

          <p class="mt-4"><strong>備註：</strong> {{ currentOrder.message }}</p>
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

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useModal } from '@/composables/useModal'
import { useOrdersStore } from '@/stores/orderStore'

const emit = defineEmits(['update-success', 'update-error'])
const store = useOrdersStore()
const modalRef = ref(null)
const { openModal: showModal, hideModal } = useModal(modalRef)

// 確保組件掛載後 Modal 已準備就緒
onMounted(() => {
  if (!modalRef.value) {
    console.error('Modal reference is not available')
  }
})

const currentOrder = ref({
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
  coupons: [],
  coupon: {
    code: '',
    title: '',
    percent: 0,
    due_date: null,
    is_enabled: 1
  }
})

const orderProducts = computed(() => {
  if (!currentOrder.value || !currentOrder.value.products) return []

  return Object.entries(currentOrder.value.products).map(([key, item]) => {
    // 基本價格計算
    const price = item.product?.price || item.price || 0
    const itemCoupon = item.coupon || {}
    const qty = item.qty || 0

    // 優惠券折扣計算
    const discountPercent = itemCoupon.percent || 0
    const discountAmount = discountPercent > 0
      ? price * (discountPercent / 100)
      : 0
    const discountedPrice = price - discountAmount

    // 返回詳細的計算結果
    return {
      id: key,
      title: item.product?.title || item.title || '未命名商品',
      price,
      qty,
      discountedPrice,
      discountAmount,
      couponTitle: itemCoupon.title || '',
      discountPercent,
      // 小計計算
      subtotal: price * qty,
      discountSubtotal: discountedPrice * qty,
      totalDiscount: discountAmount * qty
    }
  })
})

const orderSubtotal = computed(() => {
  return orderProducts.value.reduce((sum, item) => sum + (item.price * item.qty), 0)
})

const totalDiscount = computed(() => {
  return orderProducts.value.reduce((sum, item) => {
    return sum + (item.discountAmount * item.qty)
  }, 0)
})

const finalTotal = computed(() => {
  return orderSubtotal.value - totalDiscount.value
})

const openModal = (order) => {
  try {
    // 處理 Proxy 物件，將其轉換為普通物件
    const plainOrder = JSON.parse(JSON.stringify({
      ...order,
      products: Object.fromEntries(
        Object.entries(order.products || {}).map(([key, product]) => [
          key,
          {
            ...product,
            coupon: product.coupon || {
              title: '',
              percent: 0,
              is_enabled: 0
            }
          }
        ])
      )
    }))

    currentOrder.value = {
      ...currentOrder.value,
      ...plainOrder
    }

    if (modalRef.value) {
      showModal()
    } else {
      throw new Error('Modal reference is missing')
    }
  } catch (error) {
    console.error('Failed to open modal:', error)
    emit('update-error', '無法開啟訂單詳情')
  }
}

const closeModal = () => {
  hideModal()
  currentOrder.value = {
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
    coupons: [],
    coupon: {
      code: '',
      title: '',
      percent: 0,
      due_date: null,
      is_enabled: 1
    }
  }
}

// 更新付款狀態
const togglePaidStatus = async () => {
  try {
    const updatedOrder = {
      ...currentOrder.value,
      is_paid: !currentOrder.value.is_paid,
      paid_date: !currentOrder.value.is_paid ? Math.floor(Date.now() / 1000) : null,
    }
    const res = await store.updateOrder(currentOrder.value.id, updatedOrder)
    if (res.success) {
      hideModal()
      emit('update-success', `訂單${currentOrder.value.is_paid ? '取消付款' : '付款'}成功`)
    }
  } catch (error) {
    emit('update-error', error.message || '更新失敗')
  }
}

// 訂單刪除
const deleteOrderItem = async () => {
  try {
    if (confirm('確定要刪除此訂單嗎？')) {
      const res = await store.deleteOrder(currentOrder.value.id)
      if (res.success) {
        hideModal()
        emit('update-success', res.message)
      }
    }
  } catch (error) {
    emit('update-error', error.message || '刪除失敗')
  }
}

const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString()
const formatPrice = (price) => `NT$ ${Number(price).toLocaleString()}`

defineExpose({
  openModal
})
</script>

<style scoped>
.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}
.bg-light {
  background-color: #f8f9fa;
}
.bi-arrow-return-right {
  font-size: 0.9em;
  margin-right: 0.5em;
}
</style>
