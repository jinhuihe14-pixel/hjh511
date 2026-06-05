import request from '@/utils/request'

export const getOrders = (params) => {
  return request.get('/orders', { params })
}

export const getOrderById = (id) => {
  return request.get(`/orders/${id}`)
}

export const createOrder = (data) => {
  return request.post('/orders', data)
}

export const assignOrder = (id, data) => {
  return request.put(`/orders/${id}/assign`, data)
}

export const updateOrderStatus = (id, status) => {
  return request.put(`/orders/${id}/status`, { status })
}

export const getMyOrders = (params) => {
  return request.get('/orders/my-orders', { params })
}
