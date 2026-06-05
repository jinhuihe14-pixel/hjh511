import request from '@/utils/request'

export const getMyTasks = (params) => {
  return request.get('/orders/my-tasks', { params })
}

export const getOrderById = (id) => {
  return request.get(`/orders/${id}`)
}

export const startProcessing = (id) => {
  return request.put(`/orders/${id}/status`, { status: 'processing' })
}

export const completeOrder = (id) => {
  return request.put(`/orders/${id}/status`, { status: 'completed' })
}
