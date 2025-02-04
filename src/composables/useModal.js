import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as bootstrap from 'bootstrap'

export function useModal(modalRef) {
  const bsModal = ref(null)

  onMounted(() => {
    try {
      if (modalRef.value) {
        bsModal.value = new bootstrap.Modal(modalRef.value, {
          backdrop: 'static',
          keyboard: false
        })
      }
    } catch (error) {
      console.error('Modal initialization failed:', error)
    }
  })

  const openModal = () => {
    try {
      if (!bsModal.value && modalRef.value) {
        bsModal.value = new bootstrap.Modal(modalRef.value, {
          backdrop: 'static',
          keyboard: false
        })
      }
      if (bsModal.value) {
        bsModal.value.show()
      } else {
        console.warn('Modal instance is not available')
      }
    } catch (error) {
      console.error('Failed to open modal:', error)
    }
  }

  const hideModal = () => {
    try {
      if (bsModal.value) {
        bsModal.value.hide()
      }
    } catch (error) {
      console.error('Failed to hide modal:', error)
    }
  }

  onBeforeUnmount(() => {
    if (bsModal.value) {
      bsModal.value.dispose()
    }
  })

  return {
    bsModal,
    openModal,
    hideModal
  }
}
