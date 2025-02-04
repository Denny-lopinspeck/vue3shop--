<template>
  <div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">訂單明細</h5>
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
        <tfoot class="border-top">
          <tr>
            <td colspan="2" class="text-end">商品總計</td>
            <td class="text-end">NT$ {{ formatPrice(order.total) }}</td>
          </tr>
          <tr v-if="order.discount > 0">
            <td colspan="2" class="text-end text-success">
              {{ couponDisplayName }}
            </td>
            <td class="text-end text-success">-NT$ {{ formatPrice(order.discount) }}</td>
          </tr>
          <tr class="fw-bold">
            <td colspan="2" class="text-end">應付金額</td>
            <td class="text-end">NT$ {{ formatPrice(order.final_total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script>

 //顯示訂單詳細信息的組件
export default {
  name: 'OrderDetails',
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatPrice(price) {
      return Number(price).toLocaleString()
    }
  },
  computed: {
    couponDisplayName() {
     
      return `折價券`
    }
  }
}
</script>
