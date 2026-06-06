import request from '@/utils/request'

export const getServiceItems = (params) => {
  return request.get('/service-items', { params })
}
