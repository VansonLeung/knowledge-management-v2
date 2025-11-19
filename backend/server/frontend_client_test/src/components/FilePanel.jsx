import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ResponseViewer } from './ResponseViewer'

function normalizeResponse(errorOrResult) {
  if (!errorOrResult) return null
  if (errorOrResult.status) return errorOrResult
  return {
    status: 500,
    duration: 0,
    data: { message: errorOrResult.message || 'Unknown error' }
  }
}

async function rawRequest({ base, path, method = 'GET', body, token }) {
  const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path}`
  const headers = {}
  if (token) {
    headers.Authorization = token.startsWith('Bearer') ? token : `Bearer ${token}`
  }

  const started = performance.now()
  const response = await fetch(url, { method, headers, body })
  const duration = Math.round(performance.now() - started)
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const error = new Error('Request failed')
    error.status = response.status
    error.data = data
    error.duration = duration
    throw error
  }

  return { status: response.status, duration, data }
}

export function FilePanel({ apiBase, token }) {
  const [files, setFiles] = useState([])
  const [folderId, setFolderId] = useState('')
  const [conversationIds, setConversationIds] = useState('')
  const [uploadResponse, setUploadResponse] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  const [listResponse, setListResponse] = useState(null)
  const [listLoading, setListLoading] = useState(false)

  const [deleteInputs, setDeleteInputs] = useState({ fileId: '' })
  const [deleteResponse, setDeleteResponse] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const ensureAuth = () => apiBase && token

  const handleUpload = async event => {
    event.preventDefault()
    if (!ensureAuth() || files.length === 0) return
    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))
    if (folderId) formData.append('folderId', folderId)
    if (conversationIds) {
      conversationIds
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
        .forEach(id => formData.append('conversationIds', id))
    }
    setUploadLoading(true)
    try {
      const res = await rawRequest({ base: apiBase, path: '/files', method: 'POST', body: formData, token })
      setUploadResponse(res)
    } catch (error) {
      setUploadResponse(normalizeResponse(error))
    } finally {
      setUploadLoading(false)
    }
  }

  const handleList = async event => {
    event.preventDefault()
    if (!ensureAuth()) return
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''
    setListLoading(true)
    try {
      const res = await rawRequest({ base: apiBase, path: `/files${query}`, method: 'GET', token })
      setListResponse(res)
    } catch (error) {
      setListResponse(normalizeResponse(error))
    } finally {
      setListLoading(false)
    }
  }

  const handleDelete = async event => {
    event.preventDefault()
    if (!ensureAuth() || !deleteInputs.fileId) return
    setDeleteLoading(true)
    try {
      const res = await rawRequest({ base: apiBase, path: `/files/${deleteInputs.fileId}`, method: 'DELETE', token })
      setDeleteResponse(res || { status: 204, duration: 0, data: { message: 'Deleted' } })
    } catch (error) {
      setDeleteResponse(normalizeResponse(error))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files ingestion</CardTitle>
        <CardDescription>Upload files to kick off processing, list existing files, or remove them.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileInput">Files</Label>
            <Input id="fileInput" type="file" multiple onChange={event => setFiles(event.target.files)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="folderId">Folder id (optional)</Label>
              <Input id="folderId" value={folderId} onChange={event => setFolderId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conversationIds">Conversation ids (comma separated)</Label>
              <Textarea
                id="conversationIds"
                rows={2}
                value={conversationIds}
                onChange={event => setConversationIds(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={!ensureAuth() || uploadLoading || files.length === 0}>
            {uploadLoading ? 'Uploading…' : 'Upload files'}
          </Button>
          {!ensureAuth() && <p className="text-sm text-muted-foreground">Set API base + auth token first.</p>}
        </form>
        <ResponseViewer response={uploadResponse} onClear={() => setUploadResponse(null)} />

        <form onSubmit={handleList} className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="listFolder">List files (optional folder filter)</Label>
            <Input id="listFolder" value={folderId} onChange={event => setFolderId(event.target.value)} />
          </div>
          <Button type="submit" disabled={!ensureAuth() || listLoading}>
            {listLoading ? 'Loading…' : 'List files'}
          </Button>
        </form>
        <ResponseViewer response={listResponse} onClear={() => setListResponse(null)} />

        <form onSubmit={handleDelete} className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="deleteFileId">Delete file id</Label>
            <Input
              id="deleteFileId"
              value={deleteInputs.fileId}
              onChange={event => setDeleteInputs({ fileId: event.target.value })}
              required
            />
          </div>
          <Button type="submit" variant="destructive" disabled={!ensureAuth() || deleteLoading}>
            {deleteLoading ? 'Deleting…' : 'Delete file'}
          </Button>
        </form>
        <ResponseViewer response={deleteResponse} onClear={() => setDeleteResponse(null)} />
      </CardContent>
    </Card>
  )
}
