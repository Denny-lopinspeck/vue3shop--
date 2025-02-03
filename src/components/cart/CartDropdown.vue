<template>
  <div v-if="shouldShowCart" class="dropdown">
    <button
      class="btn btn-outline-primary position-relative"
      type="button"
      @click="goToCart"
      @contextmenu.prevent="toggleDropdown"
    >
      <i class="bi bi-cart3"></i>
      <span
        v-if="cartItemCount > 0"
        class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
      >
        {{ cartItemCount }}
      </span>
    </button>
    <div class="dropdown-menu dropdown-menu-end p-0" style="width: 320px">
      <div class="p-3">
        <h6 class="mb-3">購物車</h6>
        <div v-if="isLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <template v-else>
          <div v-if="!hasItems" class="text-center py-3">
            <p class="text-muted mb-0">購物車是空的</p>
          </div>
          <div v-else>
            <div class="cart-items" style="max-height: 300px; overflow-y: auto">
              <div v-for="item in cartItems" :key="item.id" class="d-flex align-items-center mb-3">
                <img
                  :src="item.product.imageUrl"
                  :alt="item.product.title"
                  class="rounded me-2"
                  style="width: 50px; height: 50px; object-fit: cover"
                />
                <div class="flex-grow-1">
                  <h6 class="mb-0 text-truncate" style="max-width: 150px">
                    {{ item.product.title }}
                  </h6>
                  <small class="text-muted">{{ item.qty }} x NT$ {{ item.product.price }}</small>
                </div>
                <div class="ms-2">
                  <button class="btn btn-sm btn-link text-danger p-0" @click="removeItem(item.id)">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="border-top mt-3 pt-3">
              <div class="d-flex justify-content-between mb-2">
                <span>總計：</span>
                <span class="text-danger fw-bold">NT$ {{ formatPrice(cart.final_total) }}</span>
              </div>
              <div class="d-grid gap-2">
                <router-link to="/cart" class="btn btn-primary btn-sm" @click="closeDropdown">
                  查看購物車
                </router-link>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { useCartStore } from '@/stores/cartStore'
import { Toast, confirmDialog } from '@/utils/toast'

import { Dropdown } from 'bootstrap'

export default {
  name: 'CartDropdown',
  emits: ['update-cart', 'error'],
  data() {
    return {
      cartStore: null,
      isLoading: false,
    }
  },
  computed: {
    // 獲取購物車資料
    cart() {
      return this.cartStore?.cart || { carts: [], total: 0, final_total: 0 }
    },
    // 獲取購物車商品列表
    cartItems() {
      return this.cart.carts || []
    },
    // 檢查購物車是否有商品
    hasItems() {
      return this.cartItems.length > 0
    },
    // 計算購物車商品數量
    cartItemCount() {
      return this.cartItems.reduce((sum, item) => sum + item.qty, 0)
    },
    // 判斷是否顯示購物車
    shouldShowCart() {
      const currentPath = this.$route.path

      const excludedPaths = ['/', '/login']
      const isDashboard = currentPath.startsWith('/dashboard')

      return !excludedPaths.includes(currentPath) && !isDashboard
    },
  },
  methods: {
    /**
     * 格式化價格數字
     * @param {number} price
     * @returns {string} 格式化價格
     */
    formatPrice(price) {
      return price.toLocaleString()
    },

    /**
     * 導向購物車頁面
     */
    goToCart() {
      try {
        this.$router.push('/cart').catch((error) => {
          console.error('Navigation Error:', error)
        })
      } catch (error) {
        console.error('Navigation Error:', error)
      }
    },

    /**
     * 切換下拉選單顯示
     * @param {Event} event 點擊事件
     */
    toggleDropdown(event) {
      const dropdownEl = event.target.closest('.dropdown')
      const dropdown = new Dropdown(
        dropdownEl.querySelector('[data-bs-toggle="dropdown"]'),
      )
      dropdown.toggle()
    },

    /**
     * 移除購物車商品
     * @param {number} id 商品 id
     */
    async removeItem(id) {
      try {
        const result = await confirmDialog({
          title: '確定要移除商品嗎？',
          icon: 'warning',
        })

        if (result.isConfirmed) {
          this.isLoading = true
          await this.cartStore.removeCartItem(id)
          Toast.fire({
            icon: 'success',
            title: '商品已移除'
          })
          this.$emit('update-cart')
        }
      } catch {
        Toast.fire({
          icon: 'error',
          title: '刪除商品失敗'
        })
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 重新載入購物車資料
     */
    async refreshCart() {
      try {
        this.isLoading = true
        await this.cartStore.getCart()
      } catch (error) {
        console.error('更新購物車失敗:', error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 關閉下拉選單
     */
    closeDropdown() {
      const dropdownEl = this.$el.querySelector('.dropdown-menu')
      if (dropdownEl.classList.contains('show')) {
        const dropdown = Dropdown.getInstance(dropdownEl)
        dropdown?.hide()
      }
    }
  },
  created() {
    this.cartStore = useCartStore()
    this.refreshCart()
  },
}
</script>

<style scoped>
.dropdown-menu {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}
</style>
