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
    /**
     * 獲取優惠券列表
     * @param {number} [page=1] - 頁碼，預設為 1
     * @returns {Promise<Object>} API 回傳結果
     */
    async getCoupons(page = 1) {
      this.setLoading(true)
      try {
        const res = await axiosInstance.get(`v2/api/${apiPath}/admin/coupons?page=${page}`)
        if (res.data.success) {
          this.setCoupons(res.data.coupons)
        }
        return res.data
      } catch (error) {
        return { success: false, message: error.response?.data?.message }
      } finally {
        this.setLoading(false)
      }
    },

    /**
     * 創建優惠券
     * @param {Object} couponData - 優惠券資料
     * @returns {Promise<Object>} API 回傳結果
     */
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

    /**
     * 刪除優惠券
     * @param {string} id - 優惠券ID
     * @returns {Promise<Object>} API 回傳結果
     */
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

    /**
     * 更新優惠券
     * @param {Object} couponData - 優惠券資料，包含 id
     * @returns {Promise<Object>} API 回傳結果
     */
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

    /**
     * 驗證優惠券
     * @param {string} code - 優惠券代碼
     * @returns {Promise<Object>} API 回傳結果
     */
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

    /**
     * 更新優惠券規則
     * @param {Object} newRules - 新的優惠券規則
     */
    async updateCouponRules(newRules) {
      this.setRules(newRules)
    },

    /**
     * 獲取優惠券狀態
     * @param {Object} coupon - 優惠券資料
     * @returns {Object} 包含 isExpired 與 isActive 屬性
     */
    getCouponStatus(coupon) {
      const now = Math.floor(Date.now() / 1000)
      return {
        isExpired: coupon.due_date < now,
        isActive: coupon.is_enabled && coupon.due_date > now,
      }
    },

    /**
     * 設置加載狀態
     * @param {boolean} isLoading - 加載狀態
     */
    setLoading(isLoading) {
      this.isLoading = isLoading
    },

    /**
     * 設置優惠券列表
     * @param {Array} coupons - 優惠券陣列
     */
    setCoupons(coupons) {
      this.coupons = coupons
    },

    /**
     * 設置優惠券規則
     * @param {Object} newRules - 新的優惠券規則
     */
    setRules(newRules) {
      this.rules = {
        ...this.rules,
        ...newRules,
      }
    },
  },
})

/**
 * 驗證優惠券規則
 * @param {Object} couponData - 優惠券資料
 * @param {Object} rules - 規則設定
 * @returns {boolean} 是否符合規則
 */
function validateCouponRules(couponData, rules) {
  if (couponData.minimum < rules.minAmount) {
    return false
  }

  if (couponData.price > rules.maxDiscount) {
    return false
  }

  return true
}

/**
 * 計算優惠券到期日期
 * @param {string|Date} dueDate - 輸入到期日期，若未輸入則使用預設 expirationDays
 * @param {number} expirationDays - 到期天數
 * @returns {number} Unix 時間戳
 */
function calculateExpirationDate(dueDate, expirationDays) {
  if (!dueDate) {
    const date = new Date()
    date.setDate(date.getDate() + expirationDays)
    return Math.floor(date.getTime() / 1000)
  }
  return Math.floor(new Date(dueDate).getTime() / 1000)
}

