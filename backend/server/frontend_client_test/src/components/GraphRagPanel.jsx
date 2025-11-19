import { useEffect, useState } from 'react'
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

export function GraphRagPanel({ config, request }) {
  const [indexesPath, setIndexesPath] = useState('/rag/indexes')
  const [indexesResponse, setIndexesResponse] = useState(null)
  const [indexesLoading, setIndexesLoading] = useState(false)

  const [createIndexInputs, setCreateIndexInputs] = useState({
    name: '',
    shards: 1,
    replicas: 0,
    mappings: ''
  })
  const [createIndexResponse, setCreateIndexResponse] = useState(null)
  const [createIndexLoading, setCreateIndexLoading] = useState(false)

  const [deleteIndexName, setDeleteIndexName] = useState('')
  const [deleteIndexLoading, setDeleteIndexLoading] = useState(false)
  const [deleteIndexResponse, setDeleteIndexResponse] = useState(null)

  const [documentsResponse, setDocumentsResponse] = useState(null)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentInputs, setDocumentInputs] = useState({
    indexName: config.defaultIndex,
    limit: 20,
    documentId: ''
  })

  useEffect(() => {
    setDocumentInputs(prev => ({ ...prev, indexName: config.defaultIndex }))
    setNewDocument(prev => ({ ...prev, indexName: config.defaultIndex }))
    setUpdateDocument(prev => ({ ...prev, indexName: config.defaultIndex }))
    setDeleteDocument(prev => ({ ...prev, indexName: config.defaultIndex }))
  }, [config.defaultIndex])

  const [newDocument, setNewDocument] = useState({
    indexName: config.defaultIndex,
    documentId: '',
    title: '',
    content: '',
    metadata: '',
    entities: '',
    relationships: '',
    chunks: ''
  })
  const [newDocumentResponse, setNewDocumentResponse] = useState(null)
  const [newDocumentLoading, setNewDocumentLoading] = useState(false)

  const [updateDocument, setUpdateDocument] = useState({
    indexName: config.defaultIndex,
    documentId: '',
    doc: '',
    upsert: false
  })
  const [updateDocumentResponse, setUpdateDocumentResponse] = useState(null)
  const [updateDocumentLoading, setUpdateDocumentLoading] = useState(false)

  const [deleteDocumentInputs, setDeleteDocument] = useState({
    indexName: config.defaultIndex,
    documentId: ''
  })
  const [deleteDocumentResponse, setDeleteDocumentResponse] = useState(null)
  const [deleteDocumentLoading, setDeleteDocumentLoading] = useState(false)

  const [metadataResponse, setMetadataResponse] = useState(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataInputs, setMetadataInputs] = useState({
    documentId: '',
    pathTemplate: '/rag/documents/{id}'
  })

  const [searchInputs, setSearchInputs] = useState({
    path: '/rag/search',
    query: '',
    topK: 5,
    includeRelations: true,
    metadata: ''
  })
  const [searchResponse, setSearchResponse] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const safeParse = (value, fallback) => {
    if (!value) return fallback
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  const callIndexes = async event => {
    event.preventDefault()
    setIndexesLoading(true)
    try {
      const res = await request({ method: 'GET', path: indexesPath })
      setIndexesResponse(res)
    } catch (error) {
      setIndexesResponse(
        normalizeResponse({ status: error.status || 500, duration: error.duration || 0, data: error.data || { message: error.message } })
      )
    } finally {
      setIndexesLoading(false)
    }
  }

  const createIndex = async event => {
    event.preventDefault()
    if (!createIndexInputs.name) return
    setCreateIndexLoading(true)
    try {
      const body = {
        name: createIndexInputs.name,
        settings: {
          number_of_shards: Number(createIndexInputs.shards) || 1,
          number_of_replicas: Number(createIndexInputs.replicas) || 0
        }
      }
      const mappings = safeParse(createIndexInputs.mappings, null)
      if (mappings) {
        body.mappings = mappings
      }
      const res = await request({ method: 'POST', path: '/rag/indexes', body })
      setCreateIndexResponse(res)
    } catch (error) {
      setCreateIndexResponse(normalizeResponse(error))
    } finally {
      setCreateIndexLoading(false)
    }
  }

  const removeIndex = async event => {
    event.preventDefault()
    if (!deleteIndexName) return
    setDeleteIndexLoading(true)
    try {
      const res = await request({ method: 'DELETE', path: `/rag/indexes/${deleteIndexName}` })
      setDeleteIndexResponse(res || { status: 204, duration: 0, data: { message: 'Deleted' } })
    } catch (error) {
      setDeleteIndexResponse(normalizeResponse(error))
    } finally {
      setDeleteIndexLoading(false)
    }
  }

  const createDocumentRecord = async event => {
    event.preventDefault()
    if (!newDocument.indexName || !newDocument.content) return
    setNewDocumentLoading(true)
    const body = {
      id: newDocument.documentId || undefined,
      title: newDocument.title || undefined,
      content: newDocument.content,
      metadata: safeParse(newDocument.metadata, {}),
      entities: safeParse(newDocument.entities, []),
      relationships: safeParse(newDocument.relationships, []),
      chunks: safeParse(newDocument.chunks, [])
    }
    try {
      const res = await request({ method: 'POST', path: `/rag/indexes/${newDocument.indexName}/documents`, body })
      setNewDocumentResponse(res)
    } catch (error) {
      setNewDocumentResponse(normalizeResponse(error))
    } finally {
      setNewDocumentLoading(false)
    }
  }

  const updateDocumentRecord = async event => {
    event.preventDefault()
    if (!updateDocument.indexName || !updateDocument.documentId) return
    const docPayload = safeParse(updateDocument.doc, null)
    if (!docPayload || typeof docPayload !== 'object') {
      setUpdateDocumentResponse(normalizeResponse({ status: 400, data: { message: 'doc must be valid JSON object' } }))
      return
    }
    setUpdateDocumentLoading(true)
    try {
      const res = await request({
        method: 'PUT',
        path: `/rag/indexes/${updateDocument.indexName}/documents/${updateDocument.documentId}`,
        body: { doc: docPayload, docAsUpsert: updateDocument.upsert }
      })
      setUpdateDocumentResponse(res)
    } catch (error) {
      setUpdateDocumentResponse(normalizeResponse(error))
    } finally {
      setUpdateDocumentLoading(false)
    }
  }

  const deleteDocumentRecord = async event => {
    event.preventDefault()
    if (!deleteDocumentInputs.indexName || !deleteDocumentInputs.documentId) return
    setDeleteDocumentLoading(true)
    try {
      const res = await request({
        method: 'DELETE',
        path: `/rag/indexes/${deleteDocumentInputs.indexName}/documents/${deleteDocumentInputs.documentId}`
      })
      setDeleteDocumentResponse(res || { status: 204, duration: 0, data: { message: 'Deleted' } })
    } catch (error) {
      setDeleteDocumentResponse(normalizeResponse(error))
    } finally {
      setDeleteDocumentLoading(false)
    }
  }

  const callDocuments = async event => {
    event.preventDefault()
    if (!documentInputs.indexName) return
    setDocumentsLoading(true)
    const pathBase = `/rag/indexes/${documentInputs.indexName}/documents`
    const url = documentInputs.documentId
      ? `${pathBase}/${documentInputs.documentId}`
      : `${pathBase}?limit=${documentInputs.limit || 20}`
    try {
      const res = await request({ method: 'GET', path: url })
      setDocumentsResponse(res)
    } catch (error) {
      setDocumentsResponse(
        normalizeResponse({ status: error.status || 500, duration: error.duration || 0, data: error.data || { message: error.message } })
      )
    } finally {
      setDocumentsLoading(false)
    }
  }

  const callMetadata = async event => {
    event.preventDefault()
    if (!metadataInputs.documentId) return
    const path = metadataInputs.pathTemplate.replace('{id}', metadataInputs.documentId)
    setMetadataLoading(true)
    try {
      const res = await request({ method: 'GET', path })
      setMetadataResponse(res)
    } catch (error) {
      setMetadataResponse(
        normalizeResponse({ status: error.status || 500, duration: error.duration || 0, data: error.data || { message: error.message } })
      )
    } finally {
      setMetadataLoading(false)
    }
  }

  const callSearch = async event => {
    event.preventDefault()
    if (!searchInputs.query) return
    setSearchLoading(true)
    let metadataFilters = undefined
    if (searchInputs.metadata) {
      try {
        metadataFilters = JSON.parse(searchInputs.metadata)
      } catch {
        metadataFilters = undefined
      }
    }
    const body = {
      query: searchInputs.query,
      topK: Number(searchInputs.topK) || 5,
      includeRelations: searchInputs.includeRelations,
      metadata: metadataFilters
    }
    try {
      const res = await request({ method: 'POST', path: searchInputs.path, body })
      setSearchResponse(res)
    } catch (error) {
      setSearchResponse(
        normalizeResponse({ status: error.status || 500, duration: error.duration || 0, data: error.data || { message: error.message } })
      )
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card as="section">
        <CardHeader>
          <CardTitle>Manage indexes</CardTitle>
          <CardDescription>Create or delete Elasticsearch indexes with sensible defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={createIndex} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newIndexName">Index name</Label>
              <Input
                id="newIndexName"
                value={createIndexInputs.name}
                onChange={event => setCreateIndexInputs(prev => ({ ...prev, name: event.target.value }))}
                placeholder="knowledge_documents"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newIndexShards">Shards</Label>
              <Input
                id="newIndexShards"
                type="number"
                min={1}
                value={createIndexInputs.shards}
                onChange={event => setCreateIndexInputs(prev => ({ ...prev, shards: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newIndexReplicas">Replicas</Label>
              <Input
                id="newIndexReplicas"
                type="number"
                min={0}
                value={createIndexInputs.replicas}
                onChange={event => setCreateIndexInputs(prev => ({ ...prev, replicas: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newIndexMappings">Mappings (JSON, optional)</Label>
              <Textarea
                id="newIndexMappings"
                value={createIndexInputs.mappings}
                onChange={event => setCreateIndexInputs(prev => ({ ...prev, mappings: event.target.value }))}
                placeholder='{"properties": {"content": {"type": "text"}}}'
                rows={4}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createIndexLoading}>
                {createIndexLoading ? 'Creating…' : 'Create index'}
              </Button>
            </div>
          </form>
          <ResponseViewer response={createIndexResponse} onClear={() => setCreateIndexResponse(null)} />

          <form onSubmit={removeIndex} className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="deleteIndex">Delete index</Label>
              <Input
                id="deleteIndex"
                value={deleteIndexName}
                onChange={event => setDeleteIndexName(event.target.value)}
                placeholder="knowledge_documents"
                required
              />
            </div>
            <Button type="submit" variant="destructive" disabled={deleteIndexLoading}>
              {deleteIndexLoading ? 'Deleting…' : 'Delete index'}
            </Button>
          </form>
          <ResponseViewer response={deleteIndexResponse} onClear={() => setDeleteIndexResponse(null)} />
        </CardContent>
      </Card>

      <Card as="section">
        <CardHeader>
          <CardTitle>Indexes</CardTitle>
          <CardDescription>List available Graph-RAG indexes with health metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={callIndexes} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="indexesPath">Endpoint path</Label>
              <Input id="indexesPath" value={indexesPath} onChange={event => setIndexesPath(event.target.value)} />
            </div>
            <Button type="submit" disabled={indexesLoading}>
              {indexesLoading ? 'Requesting…' : 'Fetch indexes'}
            </Button>
          </form>
          <ResponseViewer response={indexesResponse} onClear={() => setIndexesResponse(null)} />
        </CardContent>
      </Card>

      <Card as="section">
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Inspect documents stored within an index or fetch a specific id.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={callDocuments} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="indexName">Index name</Label>
              <Input
                id="indexName"
                value={documentInputs.indexName}
                onChange={event => setDocumentInputs(prev => ({ ...prev, indexName: event.target.value }))}
                placeholder="knowledge_documents"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docLimit">Limit</Label>
              <Input
                id="docLimit"
                type="number"
                min={1}
                value={documentInputs.limit}
                onChange={event => setDocumentInputs(prev => ({ ...prev, limit: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Ignored when a document id is provided.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="docId">Document id (optional)</Label>
              <Input
                id="docId"
                value={documentInputs.documentId}
                onChange={event => setDocumentInputs(prev => ({ ...prev, documentId: event.target.value }))}
                placeholder="uuid"
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={documentsLoading}>
                {documentsLoading ? 'Requesting…' : 'Fetch documents'}
              </Button>
            </div>
          </form>
          <ResponseViewer response={documentsResponse} onClear={() => setDocumentsResponse(null)} />
        </CardContent>
      </Card>

      <Card as="section">
        <CardHeader>
          <CardTitle>Document management</CardTitle>
          <CardDescription>Create, update, or delete documents directly inside an index.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Graph primer</p>
            <p className="mt-1">
              Treat each document as a node. Use <code>entities</code> to describe the node itself (people, systems, or
              `doc:slug` labels) and <code>relationships</code> to connect entities or other document nodes. When you want to
              reference another stored document, give both nodes an entity such as <code>{'{"name":"doc:hr-handbook"}'}</code> and point
              relationships at those names.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Entity example</p>
                <pre className="mt-1 rounded bg-background/80 p-2 text-[11px] whitespace-pre-wrap w-full">[{'{'}
  "name": "doc:hr-handbook",
  "type": "Document",
  "description": "Master onboarding policy"
{'}'}]</pre>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Relationship example</p>
                <pre className="mt-1 rounded bg-background/80 p-2 text-[11px] whitespace-pre-wrap w-full">[{'{'}
  "source": "doc:hr-handbook",
  "target": "doc:benefits-guide",
  "type": "REFERS_TO",
  "description": "Benefits section links to standalone guide"
{'}'}]</pre>
              </div>
            </div>
          </div>

          <form onSubmit={createDocumentRecord} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="newDocIndex">Index</Label>
                <Input
                  id="newDocIndex"
                  value={newDocument.indexName}
                  onChange={event => setNewDocument(prev => ({ ...prev, indexName: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDocId">Document id (optional)</Label>
                <Input
                  id="newDocId"
                  value={newDocument.documentId}
                  onChange={event => setNewDocument(prev => ({ ...prev, documentId: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDocTitle">Title</Label>
                <Input
                  id="newDocTitle"
                  value={newDocument.title}
                  onChange={event => setNewDocument(prev => ({ ...prev, title: event.target.value }))}
                  placeholder="Onboarding doc"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDocContent">Content</Label>
              <Textarea
                id="newDocContent"
                value={newDocument.content}
                onChange={event => setNewDocument(prev => ({ ...prev, content: event.target.value }))}
                rows={6}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="newDocMetadata">Metadata (JSON)</Label>
                <Textarea
                  id="newDocMetadata"
                  value={newDocument.metadata}
                  onChange={event => setNewDocument(prev => ({ ...prev, metadata: event.target.value }))}
                  rows={4}
                  placeholder='{"source":"handbook.md"}'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDocEntities">Entities (JSON array)</Label>
                <Textarea
                  id="newDocEntities"
                  value={newDocument.entities}
                  onChange={event => setNewDocument(prev => ({ ...prev, entities: event.target.value }))}
                  rows={4}
                  placeholder='[{"name":"doc:hr-handbook","type":"Document"}]'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDocRelationships">Relationships (JSON array)</Label>
                <Textarea
                  id="newDocRelationships"
                  value={newDocument.relationships}
                  onChange={event => setNewDocument(prev => ({ ...prev, relationships: event.target.value }))}
                  rows={4}
                  placeholder='[{"source":"doc:hr-handbook","target":"doc:benefits-guide","type":"REFERS_TO"}]'
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDocChunks">Chunks (JSON array)</Label>
              <Textarea
                id="newDocChunks"
                value={newDocument.chunks}
                onChange={event => setNewDocument(prev => ({ ...prev, chunks: event.target.value }))}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={newDocumentLoading}>
              {newDocumentLoading ? 'Indexing…' : 'Create document'}
            </Button>
          </form>
          <ResponseViewer response={newDocumentResponse} onClear={() => setNewDocumentResponse(null)} />

          <form onSubmit={updateDocumentRecord} className="space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="updateDocIndex">Index</Label>
                <Input
                  id="updateDocIndex"
                  value={updateDocument.indexName}
                  onChange={event => setUpdateDocument(prev => ({ ...prev, indexName: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="updateDocId">Document id</Label>
                <Input
                  id="updateDocId"
                  value={updateDocument.documentId}
                  onChange={event => setUpdateDocument(prev => ({ ...prev, documentId: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="updateDocUpsert">Upsert?</Label>
                <select
                  id="updateDocUpsert"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={updateDocument.upsert ? 'true' : 'false'}
                  onChange={event => setUpdateDocument(prev => ({ ...prev, upsert: event.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateDocPayload">doc payload (JSON)</Label>
              <Textarea
                id="updateDocPayload"
                value={updateDocument.doc}
                onChange={event => setUpdateDocument(prev => ({ ...prev, doc: event.target.value }))}
                rows={4}
                placeholder='{"metadata":{"status":"draft"}}'
                required
              />
            </div>
            <Button type="submit" disabled={updateDocumentLoading}>
              {updateDocumentLoading ? 'Updating…' : 'Update document'}
            </Button>
          </form>
          <ResponseViewer response={updateDocumentResponse} onClear={() => setUpdateDocumentResponse(null)} />

          <form onSubmit={deleteDocumentRecord} className="space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deleteDocIndex">Index</Label>
                <Input
                  id="deleteDocIndex"
                  value={deleteDocumentInputs.indexName}
                  onChange={event => setDeleteDocument(prev => ({ ...prev, indexName: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deleteDocId">Document id</Label>
                <Input
                  id="deleteDocId"
                  value={deleteDocumentInputs.documentId}
                  onChange={event => setDeleteDocument(prev => ({ ...prev, documentId: event.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="destructive" disabled={deleteDocumentLoading}>
              {deleteDocumentLoading ? 'Deleting…' : 'Delete document'}
            </Button>
          </form>
          <ResponseViewer response={deleteDocumentResponse} onClear={() => setDeleteDocumentResponse(null)} />
        </CardContent>
      </Card>

      <Card as="section">
        <CardHeader>
          <CardTitle>Metadata & relations</CardTitle>
          <CardDescription>Resolve a single node along with metadata and relation edges.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={callMetadata} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docLookup">Document id</Label>
              <Input
                id="docLookup"
                value={metadataInputs.documentId}
                onChange={event => setMetadataInputs(prev => ({ ...prev, documentId: event.target.value }))}
                placeholder="uuid"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pathTemplate">Endpoint template</Label>
              <Input
                id="pathTemplate"
                value={metadataInputs.pathTemplate}
                onChange={event => setMetadataInputs(prev => ({ ...prev, pathTemplate: event.target.value }))}
                placeholder="/rag/documents/{id}"
              />
              <p className="text-xs text-muted-foreground">`{`{id}`}` will be replaced with the provided document id.</p>
            </div>
            <Button type="submit" disabled={metadataLoading}>
              {metadataLoading ? 'Requesting…' : 'Fetch metadata'}
            </Button>
          </form>
          <ResponseViewer response={metadataResponse} onClear={() => setMetadataResponse(null)} />
        </CardContent>
      </Card>

      <Card as="section">
        <CardHeader>
          <CardTitle>Search & relations</CardTitle>
          <CardDescription>Run Graph-RAG search and optionally request relation graphs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={callSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchQuery">Query</Label>
              <Input
                id="searchQuery"
                value={searchInputs.query}
                onChange={event => setSearchInputs(prev => ({ ...prev, query: event.target.value }))}
                placeholder="How do we onboard?"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="searchPath">Endpoint path</Label>
                <Input
                  id="searchPath"
                  value={searchInputs.path}
                  onChange={event => setSearchInputs(prev => ({ ...prev, path: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topK">Top K</Label>
                <Input
                  id="topK"
                  type="number"
                  min={1}
                  value={searchInputs.topK}
                  onChange={event => setSearchInputs(prev => ({ ...prev, topK: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relations">Include relations</Label>
                <select
                  id="relations"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={searchInputs.includeRelations ? 'true' : 'false'}
                  onChange={event =>
                    setSearchInputs(prev => ({ ...prev, includeRelations: event.target.value === 'true' }))
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metadataFilter">Metadata filter (JSON)</Label>
              <Textarea
                id="metadataFilter"
                value={searchInputs.metadata}
                onChange={event => setSearchInputs(prev => ({ ...prev, metadata: event.target.value }))}
                placeholder='{"ownerId":"uuid"}'
              />
            </div>
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? 'Requesting…' : 'Run search'}
            </Button>
          </form>
          <ResponseViewer response={searchResponse} onClear={() => setSearchResponse(null)} />
        </CardContent>
      </Card>
    </div>
  )
}
