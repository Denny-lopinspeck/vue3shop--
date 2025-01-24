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
              <tr>
                <td colspan="2" class="text-end">小計：</td>
                <td>NT$ {{ formatPrice(cartStore.displayTotal) }}</td>
              </tr>
              <tr v-if="cartStore.cart.coupon.isApplied">
                <td colspan="2" class="text-end text-success">
                  預估折扣 ({{ cartStore.cart.coupon.percent }}%)：
                  <small>(實際折扣以結帳金額為準)</small>
                </td>
                <td class="text-success">-NT$ {{ formatPrice(cartStore.displayDiscount) }}</td>
              </tr>
              <tr class="fw-bold">
                <td colspan="2" class="text-end">預估結帳金額：</td>
                <td>NT$ {{ formatPrice(cartStore.displayFinalTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <div v-if="cartItems.length" class="mt-4">
      <div v-if="showOrderForm" class="row justify-content-center">
        <div class="col-md-8">
          <div class="card mb-4">
            <div class="card-body">
              <h5 class="card-title mb-3">優惠券</h5>
              <div class="d-flex gap-2">
                <input
                  type="text"
                  class="form-control"
                  v-model="couponCode"
                  placeholder="請輸入優惠券代碼"
                  :disabled="isLoading"
                />
                <button
                  class="btn btn-outline-primary"
                  @click="applyCoupon"
                  :disabled="isLoading || !couponCode"
                >
                  {{ isLoading ? '套用中...' : '套用優惠券' }}
                </button>
              </div>
              <div v-if="discount > 0" class="mt-2 text-success">
                <small>已套用優惠券，折扣金額：NT$ {{ formatPrice(discount) }}</small>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <h4 class="card-title mb-4">收件資訊</h4>
              <form @submit.prevent="submitOrder" class="row g-3">
                <div class="col-md-6">
                  <label for="name" class="form-label">姓名</label>
                  <input type="text" class="form-control" id="name" v-model="form.name" required />
                </div>
                <div class="col-md-6">
                  <label for="tel" class="form-label">電話</label>
                  <input type="tel" class="form-control" id="tel" v-model="form.tel" required />
                </div>
                <div class="col-12">
                  <label for="email" class="form-label">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    v-model="form.email"
                    required
                  />
                </div>
                <div class="col-12">
                  <label for="address" class="form-label">地址</label>
                  <input
                    type="text"
                    class="form-control"
                    id="address"
                    v-model="form.address"
                    required
                  />
                </div>
                <div class="col-12">
                  <label for="message" class="form-label">留言</label>
                  <textarea
                    class="form-control"
                    id="message"
                    v-model="form.message"
                    rows="3"
                  ></textarea>
                </div>
                <div class="col-12 text-end">
                  <button
                    type="button"
                    class="btn btn-secondary me-2"
                    @click="showOrderForm = false"
                  >
                    返回購物車
                  </button>
                  <button type="submit" class="btn btn-primary" :disabled="isLoading">
                    {{ isLoading ? '處理中...' : '確認送出' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div class="text-end" v-else>
        <button class="btn btn-primary" @click="showOrderForm = true">前往結帳</button>
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
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

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
    try {
      await this.getCartData()
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title: '載入購物車失敗'
      })
    }
  },

  beforeUnmount() {
    try {

      this.selectedItem = null
      this.couponCode = ''
      this.discount = 0


      if (this.$refs.deleteDialog?.close) {
        this.$refs.deleteDialog.close()
      }
    } catch (error) {
      console.error('組件卸載清理失敗:', error)
    }
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
    async getCartData() {
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

      } catch (error) {
        console.error('獲取購物車資料失敗:', error)
        Toast.fire({
          icon: 'error',
          title: '獲取購物車資料失敗'
        })
      } finally {
        this.isLoading = false
      }
    },

    getAvailableStock(item) {
      return item.product.unit || 0
    },

    async updateQuantity(item) {
      if (!item || item.qty < 1) {
        item.qty = 1
        return
      }

      const availableStock = item.product.unit
      if (item.qty > availableStock) {
        item.qty = availableStock
        Toast.fire({
          icon: 'warning',
          title: `數量不能超過商品庫存 ${availableStock}`
        })
        return
      }

      try {
        this.isLoading = true
        await this.cartStore.updateCart(item.id, item.product_id, item.qty)
      } catch (error) {
        Toast.fire({
          icon: 'error',
          title: '更新數量失敗'
        })
        await this.getCartData()
      } finally {
        this.isLoading = false
      }
    },

    async removeItem(id) {
      const result = await Swal.fire({
        title: '確定要移除此商品嗎？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定移除',
        cancelButtonText: '取消'
      })

      if (result.isConfirmed) {
        try {
          this.isLoading = true
          await this.cartStore.removeCartItem(id)
          Toast.fire({
            icon: 'success',
            title: '商品已移除'
          })
        } catch {
          Toast.fire({
            icon: 'error',
            title: '移除商品失敗'
          })
        } finally {
          this.isLoading = false
        }
      }
    },

    async clearCart() {
      const result = await Swal.fire({
        title: '確定要清空購物車嗎？',
        text: '此操作無法復原',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定清空',
        cancelButtonText: '取消'
      })

      if (result.isConfirmed) {
        try {
          this.isLoading = true
          await this.cartStore.clearCart()
          this.discount = 0
          Toast.fire({
            icon: 'success',
            title: '購物車已清空'
          })
        } catch {
          Toast.fire({
            icon: 'error',
            title: '清空購物車失敗'
          })
        } finally {
          this.isLoading = false
        }
      }
    },

    async submitOrder() {
      if (!this.validateForm()) return

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
          Toast.fire({
            icon: 'success',
            title: '訂單建立成功！'
          })
        }
      } catch {
        Toast.fire({
          icon: 'error',
          title: '建立訂單失敗，請稍後再試'
        })
      } finally {
        this.isLoading = false
      }
    },

    validateForm() {
      const { name, email, tel, address } = this.form
      if (!name?.trim() || !email?.trim() || !tel?.trim() || !address?.trim()) {
        Toast.fire({
          icon: 'warning',
          title: '請填寫完整的訂購資訊'
        })
        return false
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        Toast.fire({
          icon: 'warning',
          title: '請輸入有效的 Email 格式'
        })
        return false
      }
      return true
    },

    openDeleteDialog(item) {
      if (!this.$refs.deleteDialog) return

      this.selectedItem = item
      this.$refs.deleteDialog.show()
    },

    async handleDeleteConfirm({ id, productId, qty }) {
      if (!this.cartStore) return

      try {
        this.isLoading = true
        await this.cartStore.removeItemQuantity(id, productId, qty)

        if (this.$refs.deleteDialog?.close) {
          this.$refs.deleteDialog.close()
        }

        Toast.fire({
          icon: 'success',
          title: '成功刪除商品數量'
        })
      } catch (error) {
        Toast.fire({
          icon: 'error',
          title: '刪除失敗'
        })
      } finally {
        this.isLoading = false
      }
    },

    async applyCoupon() {
      if (!this.couponCode || this.isLoading) return

      try {
        this.isLoading = true
        const result = await this.cartStore?.applyCoupon(this.couponCode)

        if (result?.success) {
          this.discount = this.cartStore.displayDiscount
          Toast.fire({
            icon: 'success',
            title: `優惠券套用成功，折扣 ${this.cartStore.cart.coupon.percent}%`
          })
        }
      } catch (error) {
        Toast.fire({
          icon: 'error',
          title: error?.message || '優惠券無效'
        })
        this.discount = 0
      } finally {
        this.isLoading = false
      }
    },

    formatPrice(price) {
      return Number(price).toLocaleString()
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
