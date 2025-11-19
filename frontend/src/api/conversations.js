import api from './http'

export async function listConversations() {
  const { data } = await api.get('/conversations')
  return data.data
}

export async function createConversation(payload) {
  const { data } = await api.post('/conversations', payload)
  return data.data
}

export async function updateConversation(id, payload) {
  const { data } = await api.put(`/conversations/${id}`, payload)
  return data.data
}

export async function deleteConversation(id) {
  await api.delete(`/conversations/${id}`)
}

export async function listMessages(conversationId, params = {}) {
  const { data } = await api.get(`/conversations/${conversationId}/messages`, { params })
  return data.data
}

export async function createMessage(conversationId, payload) {
  const { data } = await api.post(`/conversations/${conversationId}/messages`, payload)
  return data.data
}
