// 引入 Vue 和相關插件
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueAxios from 'vue-axios'
import App from './App.vue'
import router from './router'
import axios from '@/utils/axios'

// 引入 Bootstrap 樣式和腳本
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

// 創建 Vue 應用實例
const app = createApp(App)
const pinia = createPinia()

// 設置全局 axios 實例
app.config.globalProperties.$axios = axios

// 使用 Pinia 狀態管理
app.use(pinia)
// 使用 Vue Router
app.use(router)
// 使用 VueAxios 插件
app.use(VueAxios, axios)

// 掛載應用到 DOM
app.mount('#app')
