<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container">
      <div class="d-flex align-items-center">
        <router-link class="navbar-brand me-3" to="/">Vue Shop</router-link>
        <button class="btn btn-outline-secondary" @click="isNavOpen = !isNavOpen">
          {{ isNavOpen ? '收合管理選單' : '展開管理選單' }}
        </button>
      </div>

      <div v-if="isNavOpen" class="navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <router-link class="nav-link" to="/dashboard/products">商品管理</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/dashboard/orders">訂單管理</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/dashboard/coupons">優惠券管理</router-link>
          </li>
        </ul>
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" href="#" @click.prevent="logout">登出</a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'ShopNavbar',
  data() {
    return {
      authStore: useAuthStore(), // 使用 authStore 來管理認證狀態
      isNavOpen: false, // 控制導航欄是否展開
    }
  },
  methods: {
    async logout() {
      try {
        await this.authStore.logout() // 執行登出操作
      } catch (error) {
        console.error('登出失敗:', error) // 處理登出失敗的情況
      }
    },
  },
}
</script>

<style scoped>
.navbar {
  padding: 1rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #333;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #666;
}

.navbar-collapse {
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  margin-left: 1rem;
}
</style>
