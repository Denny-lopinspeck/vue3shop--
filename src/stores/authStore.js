import { defineStore } from 'pinia'
import router from '@/router'
import axiosInstance from '@/utils/axios'

/**
 * 認證狀態管理 Store
 * 處理使用者登入、登出及認證狀態檢查等功能
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false, // 使用者登入狀態
    token: '', // JWT token
  }),
  actions: {
    /**
     * 使用者登入
     * @param {string} username - 使用者名稱
     * @param {string} password - 使用者密碼
     * @returns {Promise<Object>} - 登入結果
     * @throws {Error} 登入失敗時拋出錯誤
     */
    async login(username, password) {
      const res = await axiosInstance.post('/admin/signin', { username, password })

      if (res.data.success) {
        const { token, expired } = res.data
        setAuthState(this, token, expired)
        await router.push('/dashboard/products')
        return res.data
      } else {
        throw new Error('Login failed')
      }
    },

    /**
     * 使用者登出
     * 清除認證狀態、Cookie、本地存儲，並導向登入頁
     * @returns {Promise<Object>} - 登出結果
     */
    async logout() {
      clearAuthState(this)
      await router.push('/login')
      return { success: true }
    },

    /**
     * 檢查使用者認證狀態
     * 驗證 Token 有效性並更新認證狀態
     * @returns {Promise<boolean>} - 認證狀態是否有效
     */
    async checkAuth() {
      try {
        const token = getTokenFromCookie()

        if (!token) {
          await this.logout()
          return false
        }

        axiosInstance.defaults.headers.common.Authorization = token
        const res = await axiosInstance.post('/api/user/check')

        if (!res.data.success) {
          await this.logout()
          return false
        }

        this.isLoggedIn = true
        this.token = token
        return true
      } catch {
        await this.logout()
        return false
      }
    },
  },
})

/**
 * 設置認證狀態
 * @param {Object} store - Pinia store 實例
 * @param {string} token - JWT token
 * @param {string} expired - Token 過期時間
 */
function setAuthState(store, token, expired) {
  document.cookie = `hexToken=${token}; expires=${new Date(expired)}; path=/`
  axiosInstance.defaults.headers.common.Authorization = token
  store.isLoggedIn = true
  store.token = token
}

/**
 * 清除認證狀態
 * @param {Object} store - Pinia store 實例
 */
function clearAuthState(store) {
  store.isLoggedIn = false
  store.token = ''

  const domains = [window.location.hostname, '']
  const paths = ['/', '/dashboard', '']

  domains.forEach((domain) => {
    paths.forEach((path) => {
      document.cookie = `hexToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domain ? `; domain=${domain}` : ''}`
    })
  })

  delete axiosInstance.defaults.headers.common.Authorization
  axiosInstance.defaults.headers.common.Authorization = null

  localStorage.clear()
  sessionStorage.clear()
}

/**
 * 從 Cookie 中獲取 Token
 * @returns {string} - JWT token
 */
function getTokenFromCookie() {
  return document.cookie.replace(
    /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
    '$1',
  )
}
