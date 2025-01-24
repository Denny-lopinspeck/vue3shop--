import { defineStore } from 'pinia'
import router from '@/router'
import axiosInstance from '@/utils/axios'

const { VITE_APP_API, VITE_APP_PATH } = import.meta.env

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    token: '',
  }),
  actions: {

    // 登入處理
    async login(username, password) {
      try {

        // 執行登入請求
        const res = await axiosInstance.post('/admin/signin', { username, password })

        if (res.data.success) {

          // 設置 Token 和驗證狀態
          const { token, expired } = res.data
          document.cookie = `hexToken=${token}; expires=${new Date(expired)}; path=/`
          axiosInstance.defaults.headers.common.Authorization = token
          this.isLoggedIn = true
          this.token = token
          await router.push('/dashboard/products')
          return res.data
        }
      } catch (error) {
        throw error
      }
    },

    // 登出處理
    async logout() {
      try {

        // 清除所有驗證狀態和本地存儲
        this.isLoggedIn = false
        this.token = ''

        // 清除各個 domain 和 path 下的 cookie
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

        await router.push('/login')
        return { success: true }
      } catch (error) {
        throw error
      }
    },

    // 檢查用戶認證狀態
    async checkAuth() {
      try {
        
        // 獲取 Token
        const token = document.cookie.replace(
          /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
          '$1',
        )

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
      } catch (error) {
        await this.logout()
        return false
      }
    },
  },
})
