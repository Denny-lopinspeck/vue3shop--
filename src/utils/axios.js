import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/authStore'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://vue3-course-api.hexschool.io',
  timeout: 20000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// 取得 cookie token
const getTokenFromCookie = () => {
  return document.cookie.replace(/(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/, '$1')
}

// 請求攔截：加入 token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getTokenFromCookie()
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 響應攔截：處理 401 錯誤
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      await authStore.logout()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
