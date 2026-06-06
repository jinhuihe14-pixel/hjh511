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

export const getMyProcessTasks = (params) => {
  return request.get('/orders/my-process-tasks', { params })
}

export const claimProcess = (orderId, shoeIndex, processKey) => {
  return request.post(`/orders/${orderId}/shoes/${shoeIndex}/processes/${processKey}/claim`)
}

export const startProcess = (orderId, shoeIndex, processKey) => {
  return request.post(`/orders/${orderId}/shoes/${shoeIndex}/processes/${processKey}/start`)
}

export const completeProcess = (orderId, shoeIndex, processKey) => {
  return request.post(`/orders/${orderId}/shoes/${shoeIndex}/processes/${processKey}/complete`)
}

export const doQualityCheck = (orderId, shoeIndex, processKey, data) => {
  return request.post(`/orders/${orderId}/shoes/${shoeIndex}/processes/${processKey}/quality-check`, data)
}

export const reworkShoe = (orderId, shoeIndex, data) => {
  return request.post(`/orders/${orderId}/shoes/${shoeIndex}/rework`, data)
}
