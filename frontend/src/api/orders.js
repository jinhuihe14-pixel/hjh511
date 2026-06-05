import request from '@/utils/request'

export const getMyOrders = (params) => {
  return request.get('/orders/my-orders', { params })
}

export const getOrderById = (id) => {
  return request.get(`/orders/${id}`)
}

export const createOrder = (data) => {
  return request.post('/orders', data)
}

export const updateOrderStatus = (id, status) => {
  return request.put(`/orders/${id}/status`, { status })
}

export const getOrderByPickupCode = (code) => {
  return request.get(`/orders/pickup/${code}`)
}

export const getCustomerByPhone = (phone) => {
  return request.get(`/customers/phone/${phone}`)
}
