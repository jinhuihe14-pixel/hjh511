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

export const getProductionBoard = () => {
  return request.get('/stats/production-board')
}

export const getOverdueWarnings = (params) => {
  return request.get('/stats/overdue-warnings', { params })
}

export const getEmployeeProcessStats = (params) => {
  return request.get('/stats/employee-process-stats', { params })
}

export const getProcessTemplates = (params) => {
  return request.get('/process-templates', { params })
}

export const getProcessTemplateById = (id) => {
  return request.get(`/process-templates/${id}`)
}

export const createProcessTemplate = (data) => {
  return request.post('/process-templates', data)
}

export const updateProcessTemplate = (id, data) => {
  return request.put(`/process-templates/${id}`, data)
}

export const deleteProcessTemplate = (id) => {
  return request.delete(`/process-templates/${id}`)
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
