<template>
  <div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">訂單明細與摘要</h5>
      <span class="badge" :class="order.is_paid ? 'bg-success' : 'bg-warning'">
        {{ order.is_paid ? '已付款' : '未付款' }}
      </span>
    </div>
    <div class="card-body">
      <table class="table align-middle">
        <thead>
          <tr>
            <th>商品</th>
            <th>數量</th>
            <th class="text-end">小計</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in order.products" :key="item.id">
            <td>{{ item.product?.title || '商品已不存在' }}</td>
            <td>{{ item.qty }}</td>
            <td class="text-end">NT$ {{ formatPrice(item.total) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr v-if="order.discount > 0">
            <td colspan="2" class="text-end text-success">優惠折扣</td>
            <td class="text-end text-success">-NT$ {{ formatPrice(order.discount) }}</td>
          </tr>
          <tr>
            <td colspan="2" class="text-end fw-bold">結帳金額</td>
            <td class="text-end fw-bold">NT$ {{ formatPrice(order.final_total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script>
/**
 * @component OrderDetails
 * @description 顯示訂單詳細信息的組件，包含商品清單和金額計算
 */
export default {
  name: 'OrderDetails',
  props: {
    /**
     * @prop {Object} order - 訂單詳細信息
     * @required
     */
    order: {
      type: Object,
      required: true
    }
  },
  methods: {
    /**
     * @method formatPrice
     * @description 格式化價格顯示
     * @param {number} price - 需要格式化的價格
     * @returns {string} 格式化後的價格字符串
     */
    formatPrice(price) {
      return Number(price).toLocaleString()
    }
  }
}
</script>
