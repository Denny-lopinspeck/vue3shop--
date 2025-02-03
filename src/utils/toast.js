import Swal from 'sweetalert2'

/**
 * 自定義 Toast 通知設定
 */
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

/**
 * 顯示確認對話框
 * @param {Object} options - Swal.fire 的選項
 * @returns {Promise<SweetAlertResult>} - 返回一個 Promise，解析為 SweetAlertResult
 */
export const confirmDialog = (options) => {
  return Swal.fire({
    ...options,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || '確定',
    cancelButtonText: options.cancelButtonText || '取消',
  })
}
