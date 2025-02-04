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

    <div v-if="hasUnfinishedOrder" class="alert alert-warning">
      <div class="d-flex justify-content-between align-items-center">
        <p class="mb-0">您有未完成的訂單</p>
        <div class="btn-group">
          <button class="btn btn-warning" @click="continueCheckout">繼續結帳</button>
          <button class="btn btn-outline-danger" @click="clearUnfinishedOrder">清除訂單</button>
        </div>
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
import OrderForm from '@/components/cart/CartForm.vue'
import CouponForm from '@/components/cart/CartCoupon.vue'
import CarModal from '@/components/cart/CarModal.vue'
import { showToast } from '@/utils/helpers'
import Swal from 'sweetalert2'

export default {
  name: 'CartView',
  components: {
    CartTable, OrderForm, CouponForm, CarModal
  },
  data() {
    return {
      cartStore: useCartStore(),
      isLoading: false,
      selectedItem: null,
      form: {},
      hasUnfinishedOrder: false
    }
  },
  created() {
    this.initializeCart()
    const savedOrder = localStorage.getItem('checkout-order')
    if (savedOrder) {
      const order = JSON.parse(savedOrder)
      this.hasUnfinishedOrder = !order.is_paid
      if (order.is_paid) localStorage.removeItem('checkout-order')
    }
  },
  computed: {
    cartItems() {
      return this.cartStore?.cart?.carts || []
    }
  },
  methods: {
    // 初始化購物車 - 從 localStorage 讀取已保存的購物車數據
    async initializeCart() {
      const savedCart = localStorage.getItem('cart-data')
      if (savedCart) {
        try {
          this.cartStore.$patch({ cart: JSON.parse(savedCart) })
        } catch {
          console.error('購物車初始化失敗')
        }
      }
      await this.refreshCart()
    },

    // 載入購物車數據 - 處理優惠券折扣等資訊
    async loadCartData() {
      if (this.isLoading) return

      try {
        this.isLoading = true

        if (this.cartStore.cart.coupon?.isApplied) {
          this.discount = this.cartStore.displayDiscount
        }
      } catch {
        showToast('error', '載入失敗')
      } finally {
        this.isLoading = false
      }
    },

    // 清理組件狀態 - 重置所有相關變數
    cleanupComponent() {
      this.selectedItem = null
      this.couponCode = ''
      this.discount = 0

      if (this.$refs.deleteDialog?.close) {
        this.$refs.deleteDialog.close()
      }
    },

    // 更新商品數量 - 包含庫存檢查邏輯
    async updateQuantity(item) {
      if (!item || item.qty < 1) {
        item.qty = 1
        return
      }

      const availableStock = item.product.unit
      if (item.qty > availableStock) {
        item.qty = availableStock
        showToast('warning', `超過庫存 ${availableStock}`)
        return
      }

      try {
        this.isLoading = true
        await this.cartStore.updateCart(item.id, item.product_id, item.qty)
      } catch {
        showToast('error', '更新失敗')
      } finally {
        this.isLoading = false
      }
    },

    // 移除購物車商品 - 含確認對話框
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

    // 清空整個購物車 - 含確認對話框
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

    // 檢查購物車商品庫存 - 確保所有商品庫存充足
    async checkCartItemsStock() {
      try {
        for (const item of this.cartItems) {
          if (!item.qty || !item.product.unit || item.qty > item.product.unit) {
            showToast('error', `商品 ${item.product.title} 庫存不足`);
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    },

    // 提交訂單 - 處理訂單創建流程
    async submitOrder(formData) {
      try {
        this.isLoading = true
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
          if (this.cartStore.cart.coupon) {
            this.cartStore.$patch({
              cart: {
                ...this.cartStore.cart,
                coupon: { code: '', percent: 0, isApplied: false }
              }
            })
          }
          this.$router.push(`/checkout/${result.orderId}`)
          showToast('success', '訂單建立成功')
        }
      } catch {
        showToast('error', '訂單建立失敗')
      } finally {
        this.isLoading = false
      }
    },

    // 打開刪除對話框 - 用於確認刪除商品
    openDeleteDialog(item) {
      if (!this.$refs.deleteDialog) return

      this.selectedItem = item
      this.$refs.deleteDialog.show()
    },

    // 處理刪除確認 - 執行實際的刪除操作
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

    // 應用優惠券 - 處理優惠券驗證和折扣計算
    async applyCoupon(code) {
      if (!code || this.isLoading) return

      try {
        this.isLoading = true
        const result = await this.cartStore?.applyCoupon(code)

        if (result?.success) {
          this.discount = this.cartStore.displayDiscount
          showToast('success', `折扣 ${this.cartStore.cart.coupon.percent}%`)
        }
      } catch {
        showToast('error', '優惠券無效')
        this.discount = 0
      } finally {
        this.isLoading = false
      }
    },

    // 格式化價格顯示
    formatPrice(price) {
      return Number(price).toLocaleString()
    },

    // 刷新購物車數據
    async refreshCart() {
      try {
        await this.cartStore.getCart()
      } catch (error) {
        console.error('Failed to refresh cart:', error);
      }
    },

    // 繼續未完成的結帳流程
    continueCheckout() {
      const savedOrder = localStorage.getItem('checkout-order')
      if (savedOrder) {
        const order = JSON.parse(savedOrder)
        if (!order.is_paid) {
          this.$router.push(`/checkout/${order.id}`)
        } else {
          localStorage.removeItem('checkout-order')
          this.hasUnfinishedOrder = false
          this.refreshCart()
        }
      }
    },

    // 清除未完成的訂單
    clearUnfinishedOrder() {
      if (window.confirm('確定要清除未完成的訂單嗎？')) {
        localStorage.removeItem('checkout-order')
        this.hasUnfinishedOrder = false
        this.$toast?.success('已清除未完成的訂單')
      }
    }
  }
}
</script>

<style scoped>
.quantity-control {
  max-width: 160px;
}

.quantity-control .form-control {
  max-width: 80px;
}

.table th,
.table td {
  vertical-align: middle;
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
