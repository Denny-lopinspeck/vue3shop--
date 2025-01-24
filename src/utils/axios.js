import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/authStore'

const apiUrl = import.meta.env.VITE_APP_API.endsWith('/')
  ? import.meta.env.VITE_APP_API
  : `${import.meta.env.VITE_APP_API}/`

// 建立 axios 實例，設定基本配置
const axiosInstance = axios.create({
  baseURL: apiUrl,
  timeout: 20000,
  withCredentials: true, // 允許跨域請求攜帶憑證
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// 請求攔截器：在發送請求前自動添加 token
axiosInstance.interceptors.request.use(
  (config) => {
    
    // 從 cookie 中獲取 token
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/, '$1')
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  },
)

// 響應攔截器：處理 401 未授權錯誤，自動登出並跳轉
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      await authStore.logout()
      router.push('/login')
    }
    console.error('API Error:', error.response?.data?.message || error.message)
    return Promise.reject(error)
  },
)

export default axiosInstance
