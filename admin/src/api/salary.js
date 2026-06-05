import request from '@/utils/request'

export const getSalaryConfigs = () => {
  return request.get('/salary/configs')
}

export const createSalaryConfig = (data) => {
  return request.post('/salary/configs', data)
}

export const getSalaryRecords = (params) => {
  return request.get('/salary/records', { params })
}

export const getSalaryRecordById = (id) => {
  return request.get(`/salary/records/${id}`)
}

export const calculateSalary = (month) => {
  return request.post('/salary/calculate', { month })
}

export const addSalaryAdjustment = (id, data) => {
  return request.post(`/salary/records/${id}/adjustment`, data)
}

export const lockSalary = (id) => {
  return request.post(`/salary/records/${id}/lock`)
}

export const getMySalary = () => {
  return request.get('/salary/my-salary')
}
