import Swal from 'sweetalert2'

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

export const confirmDialog = (options) => {
  return Swal.fire({
    ...options,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || '確定',
    cancelButtonText: options.cancelButtonText || '取消',
  })
}
