<template>
  <div class="card">
    <div class="card-body">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          
          <thead class="table-light">
            <tr>
              <th style="width: 40%">商品名稱</th>
              <th style="width: 30%">數量</th>
              <th style="width: 30%">小計</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in cartItems" :key="item.id">
              <td>{{ item.product.title }}</td>
              <td>
                <div class="quantity-control">
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control form-control-sm"
                      v-model.number="item.qty"
                      :max="item.product.unit"
                      min="1"
                      @change="$emit('update-quantity', item)"
                    />
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="$emit('delete-item', item)"
                    >
                      <i class="bi bi-dash"></i>
                    </button>
                  </div>
                  <small v-if="item.qty >= item.product.unit" class="text-danger">
                    已達庫存上限
                  </small>
                </div>
              </td>
              <td>NT$ {{ formatPrice(item.total) }}</td>
            </tr>
          </tbody>

          <tfoot class="table-light">
            <tr v-if="coupon?.isApplied">
              <td colspan="2" class="text-end text-success">
                折扣金額 ({{ coupon.percent }}%)：
                <small>(實際折扣以結帳金額為準)</small>
              </td>
              <td class="text-success">-NT$ {{ formatPrice(discount) }}</td>
            </tr>
            <tr class="fw-bold">
              <td colspan="2" class="text-end">結帳金額：</td>
              <td>NT$ {{ formatPrice(finalTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { formatPrice } from '@/utils/helpers'

/**
 * 購物車表格元件
 * 負責顯示購物車內的商品清單、數量控制、小計金額
 * 以及優惠券折扣和最終金額的計算展示
 */
export default {
  name: 'CartTable',
  props: {
    /** 購物車內的商品陣列 */
    cartItems: {
      type: Array,
      required: true
    },
    /** 優惠券折扣金額 */
    discount: {
      type: Number,
      default: 0
    },
    /** 最終結帳金額 */
    finalTotal: {
      type: Number,
      required: true
    },
    /** 優惠券資訊物件 */
    coupon: {
      type: Object,
      default: () => ({})
    }
  },
  methods: {
    formatPrice
  }
}
</script>

<style scoped>
.quantity-control {
  max-width: 160px;
}

.quantity-control .form-control {
  max-width: 80px;
}

.table th,
.table td {
  vertical-align: middle;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-responsive {
  margin: -1rem;
}

@media (max-width: 768px) {
  .quantity-control {
    max-width: 120px;
  }

  .quantity-control .form-control {
    max-width: 60px;
  }
}
</style>
