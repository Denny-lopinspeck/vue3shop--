<template>
  <div class="mt-4">
    <div class="card">
      <div class="card-body">
        <h3 class="mb-4">訂購資訊</h3>
        <form @submit.prevent="handleSubmit">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">姓名 <span class="text-danger">*</span></label>
              <input
                type="text"
                class="form-control"
                v-model="form.name"
                required
              >
            </div>
            <div class="col-md-6">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input
                type="email"
                class="form-control"
                v-model="form.email"
                required
              >
            </div>
            <div class="col-md-6">
              <label class="form-label">電話 <span class="text-danger">*</span></label>
              <input
                type="tel"
                class="form-control"
                v-model="form.tel"
                required
              >
            </div>
            <div class="col-md-6">
              <label class="form-label">地址 <span class="text-danger">*</span></label>
              <input
                type="text"
                class="form-control"
                v-model="form.address"
                required
              >
            </div>
            <div class="col-12">
              <label class="form-label">訂單備註</label>
              <textarea
                class="form-control"
                v-model="form.message"
                rows="3"
              ></textarea>
            </div>
          </div>
          <div class="text-end mt-4">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isLoading"
            >
              {{ isLoading ? '處理中...' : '確認結帳' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { useFormValidation } from '@/composables/useFormValidation'

export default {
  name: 'OrderForm',
  setup() {
    const { validateForm } = useFormValidation()
    return { validateForm }
  },
  props: {
    /** 控制表單是否處於載入狀態 */
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      /** 訂單表單資料物件 */
      form: {
        name: '',    // 訂購者姓名
        email: '',   // 訂購者Email
        tel: '',     // 聯絡電話
        address: '', // 配送地址
        message: ''  // 訂單備註
      }
    }
  },
  methods: {
    handleSubmit() {
      const { validateForm } = useFormValidation()
      if (!validateForm(this.form)) return

      const formData = { ...this.form }
      this.$emit('submit-order', formData)
    }
  }
}
</script>
