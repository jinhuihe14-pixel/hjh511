import request from '@/utils/request'

export const getDashboardStats = () => {
  return request.get('/stats/dashboard')
}

export const getRevenueTrend = (params) => {
  return request.get('/stats/revenue-trend', { params })
}

export const getServiceStats = (params) => {
  return request.get('/stats/service-stats', { params })
}

export const getEmployeePerformance = (params) => {
  return request.get('/stats/employee-performance', { params })
}
