export function useFormValidation() {
  const validateForm = (form) => {
    if (!form.name?.trim()) {
      alert('請填寫姓名')
      return false
    }

    if (!form.email?.trim()) {
      alert('請填寫 Email')
      return false
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(form.email)) {
      alert('請填寫有效的 Email 格式')
      return false
    }

    if (!form.tel?.trim()) {
      alert('請填寫電話')
      return false
    }

    if (!form.address?.trim()) {
      alert('請填寫地址')
      return false
    }

    return true
  }

  return {
    validateForm
  }
}
