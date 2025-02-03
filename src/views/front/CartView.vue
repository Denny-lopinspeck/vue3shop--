<template>
  <div class="container py-5">
    <div class="row mb-4">
      <div class="col d-flex justify-content-between align-items-center">
        <h2 class="mb-0">購物車</h2>
        <button v-if="cartItems.length" class="btn btn-outline-danger" @click="clearCart">
          清空購物車
        </button>
      </div>
    </div>

    <div class="alert alert-info" v-if="!cartItems.length">購物車內尚無商品</div>
    <div v-else class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 40%">商品名稱</th>
                <th style="width: 30%">數量</th>
                <th style="width: 30%">小計</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in cartItems" :key="item.id">
                <td>{{ item.product.title }}</td>
                <td>
                  <div class="quantity-control">
                    <div class="input-group">
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        v-model.number="item.qty"
                        :max="item.product.unit"
                        min="1"
                        @change="updateQuantity(item)"
                      />
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        @click="openDeleteDialog(item)"
                      >
                        <i class="bi bi-dash"></i>
                      </button>
                    </div>
                    <small v-if="item.qty >= item.product.unit" class="text-danger">
                      已達庫存上限
                    </small>
                  </div>
                </td>
                <td>NT$ {{ formatPrice(item.total) }}</td>
              </tr>
            </tbody>
            <tfoot class="table-light">

              <tr v-if="cartStore.cart.coupon.isApplied">
                <td colspan="2" class="text-end text-success">
                  折扣金額 ({{ cartStore.cart.coupon.percent }}%)：
                  <small>(實際折扣以結帳金額為準)</small>
                </td>
                <td class="text-success">-NT$ {{ formatPrice(cartStore.displayDiscount) }}</td>
              </tr>
              <tr class="fw-bold">
                <td colspan="2" class="text-end">結帳金額：</td>
                <td>NT$ {{ formatPrice(cartStore.displayFinalTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>



    <!-- 新增優惠券輸入區塊 -->
    <div v-if="cartItems.length" class="mt-4">
      <div class="card">
        <div class="card-body">
          <h3 class="mb-3">優惠券</h3>
          <div class="input-group">
            <input type="text" class="form-control" placeholder="輸入優惠券代碼" v-model="couponCode">
            <button type="button" class="btn btn-outline-secondary" @click="applyCoupon" :disabled="isLoading">
              套用優惠券
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 保留訂購資訊表單 -->
    <div v-if="cartItems.length" class="mt-4">
      <div class="card">
        <div class="card-body">
          <h3 class="mb-4">訂購資訊</h3>
          <form @submit.prevent="submitOrder">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">姓名 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" v-model="form.name" required>
              </div>
              <div class="col-md-6">
                <label class="form-label">Email <span class="text-danger">*</span></label>
                <input type="email" class="form-control" v-model="form.email" required>
              </div>
              <div class="col-md-6">
                <label class="form-label">電話 <span class="text-danger">*</span></label>
                <input type="tel" class="form-control" v-model="form.tel" required>
              </div>
              <div class="col-md-6">
                <label class="form-label">地址 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" v-model="form.address" required>
              </div>
              <div class="col-12">
                <label class="form-label">訂單備註</label>
                <textarea class="form-control" v-model="form.message" rows="3"></textarea>
              </div>
            </div>
            <div class="text-end mt-4">
              <button type="submit" class="btn btn-primary" :disabled="isLoading">
                {{ isLoading ? '處理中...' : '確認結帳' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>

  <CarModal
    ref="deleteDialog"
    :item="selectedItem"
    :is-loading="isLoading"
    @close="selectedItem = null"
    @confirm="handleDeleteConfirm"
  />
</template>

<script>
import { useCartStore } from '@/stores/cartStore'
import CarModal from '@/components/CarModal.vue'
// ...移除 OrderForm import...
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

function showToast(icon, title) {
  Toast.fire({
    icon,
    title,
  })
}

function validateForm(form) {
  const { name, email, tel, address } = form
  if (!name?.trim() || !email?.trim() || !tel?.trim() || !address?.trim()) {
    showToast('warning', '請填寫完整的訂購資訊')
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    showToast('warning', '請輸入有效的 Email 格式')
    return false
  }
  return true
}

export default {
  name: 'CartView',
  components: {
    CarModal,
  },
  data() {
    return {
      cartStore: useCartStore(),
      isLoading: false,
      showOrderForm: false,
      form: {
        name: '',
        email: '',
        tel: '',
        address: '',
        message: '',
      },
      deleteModal: null,
      selectedItem: null,
      deleteQty: 1,
      couponCode: '',
      discount: 0,
    }
  },
  async created() {
    this.cartStore = useCartStore()
    // 若 localStorage 中有未結帳購物車資料，先更新 store
    const savedCart = localStorage.getItem('cart-data')
    if (savedCart) {
      try {
        this.cartStore.$patch({ cart: JSON.parse(savedCart) })
      } catch (e) {
        console.error('載入購物車資料失敗', e)
      }
    }
    // 呼叫 API 取得最新購物車資料（當有新增產品時）
    this.refreshCart()
  },
  beforeUnmount() {
    this.cleanupComponent()
  },
  computed: {
    cartItems() {
      return this.cartStore?.cart?.carts || []
    },
    total() {
      return this.cartStore?.cart?.final_total || 0
    },
    hasItems() {
      return this.cartItems.length > 0
    },
  },
  methods: {
    /**
     * 載入購物車資料
     */
    async loadCartData() {
      if (this.isLoading) return

      try {
        this.isLoading = true
        const result = await this.cartStore.getCart()

        if (!result.success) {
          throw new Error('購物車資料載入失敗')
        }

        if (this.cartStore.cart.coupon?.isApplied) {
          this.discount = this.cartStore.displayDiscount
        }
      } catch {
        showToast('error', '獲取購物車資料失敗')
      } finally {
        this.isLoading = false
      }
    },
    /**
     * 清理元件資源
     */
    cleanupComponent() {
      this.selectedItem = null
      this.couponCode = ''
      this.discount = 0

      if (this.$refs.deleteDialog?.close) {
        this.$refs.deleteDialog.close()
      }
    },
    /**
     * 更新商品數量
     * @param {Object} item - 商品物件
     */
    async updateQuantity(item) {
      if (!item || item.qty < 1) {
        item.qty = 1
        return
      }

      const availableStock = item.product.unit
      if (item.qty > availableStock) {
        item.qty = availableStock
        showToast('warning', `數量不能超過商品庫存 ${availableStock}`)
        return
      }

      try {
        this.isLoading = true
        await this.cartStore.updateCart(item.id, item.product_id, item.qty)
      } catch {
        showToast('error', '更新數量失敗')
        await this.loadCartData()
      } finally {
        this.isLoading = false
      }
    },
    /**
     * 移除單一商品 (需使用者確認)
     * @param {number} id - 商品的 ID
     */
    async removeItem(id) {
      const result = await Swal.fire({
        title: '確定要移除此商品嗎？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定移除',
        cancelButtonText: '取消',
      })

      if (result.isConfirmed) {
        try {
          this.isLoading = true
          await this.cartStore.removeCartItem(id)
          showToast('success', '商品已移除')
        } catch {
          showToast('error', '移除商品失敗')
        } finally {
          this.isLoading = false
        }
      }
    },
    /**
     * 清空購物車所有商品
     */
    async clearCart() {
      const result = await Swal.fire({
        title: '確定要清空購物車嗎？',
        text: '此操作無法復原',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定清空',
        cancelButtonText: '取消',
      })

      if (result.isConfirmed) {
        try {
          this.isLoading = true
          await this.cartStore.clearCart()
          this.discount = 0
          showToast('success', '購物車已清空')
        } catch {
          showToast('error', '清空購物車失敗')
        } finally {
          this.isLoading = false
        }
      }
    },
    /**
     * 提交訂單 (表單驗證通過時)
     */
    async submitOrder() {
      if (!validateForm(this.form)) return

      try {
        this.isLoading = true
        const orderData = {
          user: {
            name: this.form.name,
            email: this.form.email,
            tel: this.form.tel,
            address: this.form.address,
          },
          message: this.form.message,
        }

        const result = await this.cartStore.createOrder(orderData)
        if (result.success) {
          this.$router.push(`/checkout/${result.orderId}`)
          showToast('success', '訂單建立成功！')
        }
      } catch {
        showToast('error', '建立訂單失敗，請稍後再試')
      } finally {
        this.isLoading = false
      }
    },
    /**
     * 開啟刪除確認對話框
     * @param {Object} item - 要刪除的商品
     */
    openDeleteDialog(item) {
      if (!this.$refs.deleteDialog) return

      this.selectedItem = item
      this.$refs.deleteDialog.show()
    },
    /**
     * 處理刪除確認動作
     * @param {Object} param0 - 包含 id、productId 和 qty 的物件
     */
    async handleDeleteConfirm({ id, productId, qty }) {
      if (!this.cartStore) return

      try {
        this.isLoading = true
        await this.cartStore.removeItemQuantity(id, productId, qty)

        if (this.$refs.deleteDialog?.close) {
          this.$refs.deleteDialog.close()
        }

        showToast('success', '成功刪除商品數量')
      } catch {
        showToast('error', '刪除失敗')
      } finally {
        this.isLoading = false
      }
    },
    /**
     * 套用優惠券至購物車
     */
    async applyCoupon() {
      if (!this.couponCode || this.isLoading) return

      try {
        this.isLoading = true
        const result = await this.cartStore?.applyCoupon(this.couponCode)

        if (result?.success) {
          this.discount = this.cartStore.displayDiscount
          showToast('success', `優惠券套用成功，折扣 ${this.cartStore.cart.coupon.percent}%`)
        }
      } catch {
        showToast('error', '優惠券無效')
        this.discount = 0
      } finally {
        this.isLoading = false
      }
    },
    /**
     * 格式化價格為區域字串
     * @param {number} price - 需要格式化的價格
     * @returns {string} 格式化後的價格字串
     */
    formatPrice(price) {
      return Number(price).toLocaleString()
    },
    /**
     * 更新購物車資料
     */
    async refreshCart() {
      try {
        await this.cartStore.getCart()
      } catch (error) {
        console.error('更新購物車失敗:', error)
      }
    },
  },
}
</script>

<style scoped>
.quantity-control {
  max-width: 160px;
}

quantity-control .form-control {
  max-width: 80px;
}

.table th,
.table td {
  vertical-align: middle;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-responsive {
  margin: -1rem;
}

@media (max-width: 768px) {
  .quantity-control {
    max-width: 120px;
  }

  .quantity-control .form-control {
    max-width: 60px;
  }
}
</style>
