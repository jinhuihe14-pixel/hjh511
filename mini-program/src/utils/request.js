import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    showToast(error.response?.data?.message || error.message || '请求失败')
    return Promise.reject(error)
  }
)

export default request
