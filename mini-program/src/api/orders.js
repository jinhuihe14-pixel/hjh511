import request from '@/utils/request'

export const getCustomerOrders = (phone, params) => {
  return request.get(`/orders/customer/${phone}`, { params })
}

export const getOrderById = (id) => {
  return request.get(`/orders/${id}`)
}

export const getOrderByPickupCode = (code) => {
  return request.get(`/orders/pickup/${code}`)
}

export const getCustomerByPhone = (phone) => {
  return request.get(`/customers/phone/${phone}/public`)
}
