import request from '@/utils/request'

export const getCustomers = (params) => {
  return request.get('/customers', { params })
}

export const getCustomerById = (id) => {
  return request.get(`/customers/${id}`)
}

export const createCustomer = (data) => {
  return request.post('/customers', data)
}

export const updateCustomer = (id, data) => {
  return request.put(`/customers/${id}`, data)
}

export const getCustomerByPhone = (phone) => {
  return request.get(`/customers/phone/${phone}`)
}
