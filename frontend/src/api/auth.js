import api from './http'

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data.data
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload)
  return data.data
}

export async function fetchProfile() {
  const { data } = await api.get('/auth/me')
  return data.data
}
