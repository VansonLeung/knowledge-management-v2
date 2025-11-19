import api from './http'

export async function listFiles(params = {}) {
  const { data } = await api.get('/files', { params })
  return data.data
}

export async function uploadFiles(files, options = {}) {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))

  if (options.folderId) formData.append('folderId', options.folderId)
  if (options.conversationIds) {
    options.conversationIds.forEach(id => formData.append('conversationIds', id))
  }

  const { data } = await api.post('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  return data.data
}

export async function deleteFile(fileId) {
  await api.delete(`/files/${fileId}`)
}
