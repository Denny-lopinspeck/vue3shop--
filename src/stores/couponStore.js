import { defineStore } from 'pinia'
import axiosInstance from '@/utils/axios'

const apiPath = import.meta.env.VITE_APP_PATH

export const useCouponStore = defineStore('coupon', {
  state: () => ({
    coupons: [],
    isLoading: false,
    rules: {
      minAmount: 100,
      maxDiscount: 1000,
      maxUsagePerUser: 1,
      expirationDays: 30,
      allowedCategories: [],
      excludedProducts: [],
    },
  }),

  actions: {
    // 獲取優惠券列表
    async getCoupons(page = 1) {
      this.setLoading(true)
      try {
        const res = await axiosInstance.get(`v2/api/${apiPath}/admin/coupons?page=${page}`)
        if (res.data.success) {
          this.setCoupons(res.data.coupons)
          return {
            success: true,
            pagination: res.data.pagination
          }
        }
        return {
          success: false,
          message: res.data.message,
        }
      } catch (error) {
        return { success: false, message: error.response?.data?.message }
      } finally {
        this.setLoading(false)
      }
    },

    // 創建優惠券
    async createCoupon(couponData) {
      this.setLoading(true)
      try {
        if (!validateCouponRules(couponData, this.rules)) {
          throw new Error('優惠券不符合規則')
        }

        const res = await axiosInstance.post(`v2/api/${apiPath}/admin/coupon`, {
          data: {
            ...couponData,
            due_date: calculateExpirationDate(couponData.due_date, this.rules.expirationDays),
          },
        })
        if (res.data.success) {
          await this.getCoupons()
        }
        return res.data
      } catch (error) {
        return { success: false, message: error.message || '創建失敗' }
      } finally {
        this.setLoading(false)
      }
    },

    // 刪除優惠券
    async deleteCoupon(id) {
      this.setLoading(true)
      try {
        const res = await axiosInstance.delete(`v2/api/${apiPath}/admin/coupon/${id}`)
        if (res.data.success) {
          await this.getCoupons()
        }
        return res.data
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '刪除失敗' }
      } finally {
        this.setLoading(false)
      }
    },

    // 更新優惠券
    async updateCoupon(couponData) {
      this.setLoading(true)
      try {
        const res = await axiosInstance.put(`v2/api/${apiPath}/admin/coupon/${couponData.id}`, {
          data: couponData,
        })
        if (res.data.success) {
          await this.getCoupons()
        }
        return res.data
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || '更新失敗',
        }
      } finally {
        this.setLoading(false)
      }
    },

    // 驗證優惠券
    async verifyCoupon(code) {
      try {
        const res = await axiosInstance.post(`v2/api/${apiPath}/verify_coupon`, {
          data: { code },
        })
        return res.data
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || '優惠券驗證失敗',
        }
      }
    },

    // 更新優惠券規則
    async updateCouponRules(newRules) {
      this.setRules(newRules)
    },

    // 獲取優惠券狀態
    getCouponStatus(coupon) {
      const now = Math.floor(Date.now() / 1000)
      return {
        isExpired: coupon.due_date < now,
        isActive: coupon.is_enabled && coupon.due_date > now,
      }
    },

    setLoading(isLoading) {
      this.isLoading = isLoading
    },

    setCoupons(coupons) {
      this.coupons = coupons
    },

    setRules(newRules) {
      this.rules = {
        ...this.rules,
        ...newRules,
      }
    },
  },
})

// 驗證優惠券規則
function validateCouponRules(couponData, rules) {
  if (couponData.minimum < rules.minAmount) {
    return false
  }

  if (couponData.price > rules.maxDiscount) {
    return false
  }

  return true
}

// 計算優惠券到期日期
function calculateExpirationDate(dueDate, expirationDays) {
  if (!dueDate) {
    const date = new Date()
    date.setDate(date.getDate() + expirationDays)
    return Math.floor(date.getTime() / 1000)
  }
  return Math.floor(new Date(dueDate).getTime() / 1000)
}

