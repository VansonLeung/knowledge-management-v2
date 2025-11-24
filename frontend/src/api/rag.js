import api from './http'

export async function searchKnowledgeBase(payload) {
  const { data } = await api.post('/rag/search', payload)
  return data.data
}

export async function runWorkflow(payload) {
  const { data } = await api.post('/rag/workflows/basic', payload)
  return data.data
}
