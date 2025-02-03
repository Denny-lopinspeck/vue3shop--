export const testOrders = [
  {
    id: 'test-001',
    num: 'TEST20240101',
    create_at: 1704067200,
    is_paid: true,
    paid_date: 1704067800,
    message: '這是測試訂單1',
    payment_method: 'credit_card',
    total: 1280,
    user: {
      name: '測試用戶1',
      email: 'test1@example.com',
      tel: '0912345678',
      address: '測試市測試區測試路1號',
    },
  },
  {
    id: 'test-002',
    num: 'TEST20240102',
    create_at: 1704153600,
    is_paid: false,
    message: '這是測試訂單2',
    payment_method: 'ATM',
    total: 2380,
    user: {
      name: '測試用戶2',
      email: 'test2@example.com',
      tel: '0923456789',
      address: '測試市測試區測試路2號',
    },
  },
]
