import request from '@/utils/request'

export const getMySalary = () => {
  return request.get('/salary/my-salary')
}
