import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:16001/api'

const api = axios.create({
  baseURL: API_BASE_URL
})

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message
    return Promise.reject(new Error(message))
  }
)

export default api
