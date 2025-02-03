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
    <CartTable
      v-else
      :cart-items="cartItems"
      :discount="cartStore.displayDiscount"
      :final-total="cartStore.displayFinalTotal"
      :coupon="cartStore.cart.coupon"
      @update-quantity="updateQuantity"
      @delete-item="openDeleteDialog"
    />

    <CouponForm
      v-if="cartItems.length"
      :is-loading="isLoading"
      @apply-coupon="applyCoupon"
    />

    <OrderForm
      v-if="cartItems.length"
      :is-loading="isLoading"
      @submit-order="submitOrder"
    />
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
import CartTable from '@/components/cart/CartTable.vue'
import OrderForm from '@/components/cart/CartForm.vue'  // 更新引入路徑
import CouponForm from '@/components/cart/CartCoupon.vue'
import CarModal from '@/components/cart/CarModal.vue'
import { showToast } from '@/utils/helpers'
import Swal from 'sweetalert2'

export default {
  name: 'CartView',
  components: {
    CartTable,
    OrderForm,
    CouponForm,
    CarModal
  },
  data() {
    return {
      cartStore: useCartStore(),
      isLoading: false,
      selectedItem: null,
      form: {}, // 新增form屬性來存儲訂單資料
    }
  },
  created() {
    this.initializeCart()
  },
  computed: {
    cartItems() {
      return this.cartStore?.cart?.carts || []
    }
  },
  methods: {
    async initializeCart() {
      const savedCart = localStorage.getItem('cart-data')
      if (savedCart) {
        try {
          this.cartStore.$patch({ cart: JSON.parse(savedCart) })
        } catch (e) {
          console.error('載入購物車資料失敗', e)
        }
      }
      await this.refreshCart()
    },
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
    async submitOrder(formData) {
      try {
        this.isLoading = true
        this.form = formData

        const orderData = {
          user: {
            name: formData.name,
            email: formData.email,
            tel: formData.tel,
            address: formData.address,
          },
          message: formData.message,
        }

        const result = await this.cartStore.createOrder(orderData)
        if (result.success) {
          // 清除優惠券資訊
          if (this.cartStore.cart.coupon) {
            this.cartStore.$patch({
              cart: {
                ...this.cartStore.cart,
                coupon: {
                  code: '',
                  percent: 0,
                  isApplied: false
                }
              }
            })
          }
          this.discount = 0
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
     * @param {string} code - 優惠券代碼
     * @returns {Promise<void>}
     */
    async applyCoupon(code) {
      if (!code || this.isLoading) return

      try {
        this.isLoading = true
        const result = await this.cartStore?.applyCoupon(code)

        if (result?.success) {
          this.discount = this.cartStore.displayDiscount
          showToast('success', `優惠券套用成功，折扣 ${this.cartStore.cart.coupon.percent}%`)
        }
      } catch (error) {
        console.error('優惠券套用失敗:', error)
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
