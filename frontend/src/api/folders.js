import api from './http'

export async function listFolders() {
  const { data } = await api.get('/folders')
  return data.data
}

export async function createFolder(payload) {
  const { data } = await api.post('/folders', payload)
  return data.data
}

export async function updateFolder(folderId, payload) {
  const { data } = await api.patch(`/folders/${folderId}`, payload)
  return data.data
}
