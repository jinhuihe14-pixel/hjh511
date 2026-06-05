import request from '@/utils/request'

export const getMySalary = () => {
  return request.get('/salary/my-salary')
}

export const getMyAppeals = (params) => {
  return request.get('/salary/appeals/my', { params })
}

export const getAppealById = (id) => {
  return request.get(`/salary/appeals/${id}')
}

export const createAppeal = (data) => {
  return request.post('/salary/appeals', data)
}
