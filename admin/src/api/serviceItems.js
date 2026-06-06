import request from '@/utils/request'

export const getServiceItems = (params) => {
  return request.get('/service-items', { params })
}

export const getServiceItemById = (id) => {
  return request.get(`/service-items/${id}`)
}

export const createServiceItem = (data) => {
  return request.post('/service-items', data)
}

export const updateServiceItem = (id, data) => {
  return request.put(`/service-items/${id}`, data)
}

export const toggleServiceItem = (id) => {
  return request.patch(`/service-items/${id}/toggle`)
}

export const deleteServiceItem = (id) => {
  return request.delete(`/service-items/${id}`)
}
