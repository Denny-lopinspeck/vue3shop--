<template>
  <div class="input-group">
    <button
      class="btn btn-outline-secondary"
      type="button"
      @click="decrease"
      :disabled="modelValue <= 1"
    >
      <i class="bi bi-dash"></i>
    </button>
    <input
      type="number"
      class="form-control text-center"
      :value="modelValue"
      @input="updateValue($event.target.value)"
      min="1"
      :max="max"
    />
    <button
      class="btn btn-outline-secondary"
      type="button"
      @click="increase"
      :disabled="modelValue >= max"
    >
      <i class="bi bi-plus"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'QuantitySelector',
  props: {
    modelValue: {
      type: Number,
      default: 1,
    },
    max: {
      type: Number,
      default: 99,
    },
  },
  methods: {
    /**
     * 更新數量值（並限制在 1 與 max 之間）
     * @param {string} value 輸入的數值字串
     */
    updateValue(value) {
      const { max } = this
      const newValue = Math.min(Math.max(Number(value) || 1, 1), max)
      this.$emit('update:modelValue', newValue)
    },

    /**
     * 增加數量
     */
    increase() {
      const { modelValue, max } = this
      if (modelValue < max) {
        this.updateValue(modelValue + 1)
      }
    },

    /**
     * 減少數量
     */
    decrease() {
      const { modelValue } = this
      if (modelValue > 1) {
        this.updateValue(modelValue - 1)
      }
    },
  },
}
</script>
