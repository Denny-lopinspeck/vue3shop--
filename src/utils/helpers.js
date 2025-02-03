/**
 * 通用輔助函數模組
 * 包含共用的提示訊息、格式轉換和表單驗證等功能
 */

import Swal from 'sweetalert2'

/**
 * Toast 通知設定
 * 用於顯示操作結果的快速提示
 */
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

/**
 * 顯示 Toast 通知
 * @param {string} icon - 通知圖示類型 (success/error/warning/info)
 * @param {string} title - 通知訊息內容
 */
export function showToast(icon, title) {
  Toast.fire({
    icon,
    title,
  })
}

/**
 * 數字金額格式化
 * 將數字轉換為千分位格式
 * @param {number} price - 要格式化的金額
 * @returns {string} 已格式化的金額字串
 */
export function formatPrice(price) {
  return Number(price).toLocaleString()
}

/**
 * 訂單表單驗證
 * 驗證必填欄位和Email格式
 * @param {Object} form - 訂單表單資料
 * @returns {boolean} 驗證結果
 */
export function validateForm(form) {
  const { name, email, tel, address } = form
  if (!name?.trim() || !email?.trim() || !tel?.trim() || !address?.trim()) {
    showToast('warning', '請填寫完整的訂購資訊')
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    showToast('warning', '請輸入有效的 Email 格式')
    return false
  }
  return true
}
