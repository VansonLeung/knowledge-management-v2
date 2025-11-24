import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { searchKnowledgeBase } from '@/api/rag'

export function FileDiagnosticsDialog({ open, onClose, data, isLoading }) {
  const [chunkFilter, setChunkFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [chunkResults, setChunkResults] = useState(null)

  const chunkVectors = useMemo(() => {
    if (data?.document?.sampleChunks) return data.document.sampleChunks
    return data?.document?.chunkVectors || []
  }, [data])

  const entityBadges = useMemo(() => {
    if (!Array.isArray(data?.document?.entities)) return []
    return data.document.entities
      .map(entity => {
        if (!entity) return null
        const value = entity.value ?? entity.name
        if (!value || !String(value).trim()) return null
        return {
          type: entity.type || 'keyword',
          value: String(value).trim()
        }
      })
      .filter(Boolean)
  }, [data])

  useEffect(() => {
    if (!open) {
      setChunkFilter('')
      setSearchQuery('')
      setSearchError(null)
      setChunkResults(null)
    }
  }, [open])

  const filteredChunks = useMemo(() => {
    if (!chunkFilter.trim()) return chunkVectors
    const term = chunkFilter.trim().toLowerCase()
    return chunkVectors.filter(chunk => {
      const metadataString = JSON.stringify(chunk.metadata || {})
      const haystack = `${chunk.content || ''} ${metadataString}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [chunkFilter, chunkVectors])

  if (!open) return null

  const handleClose = () => {
    if (searching) return
    onClose?.()
  }

  const runSearch = async () => {
    if (!data?.file?.id || !searchQuery.trim()) {
      setSearchError('Enter a query to test search results.')
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const payload = {
        query: searchQuery,
        topK: 10,
        includeRelations: false,
        searchMode: 'vector',
        vectorWeight: 1,
        textWeight: 0,
        candidateCount: 30,
        metadata: {
          'metadata.fileId': [data.file.id]
        }
      }

      const result = await searchKnowledgeBase(payload)
      const flattened = (result.documents || [])
        .map(doc => {
          // Handle chunk-as-document
          if (doc.content && !doc.bestChunk && !doc.chunks) {
            return {
              id: doc.id,
              content: doc.content,
              metadata: doc.metadata || {},
              score: doc.vectorScore ?? doc.hybridScore ?? null,
              title: doc.title || doc.metadata?.originalName || doc.id
            }
          }

          const chunk = doc.bestChunk || doc.chunks?.[0]
          const content = typeof chunk?.content === 'string' ? chunk.content : String(chunk?.content || '')
          if (!chunk || !content.trim()) return null
          return {
            id: chunk.id || `${doc.id}::chunk`,
            content,
            metadata: chunk.metadata || {},
            score: chunk.score ?? doc.vectorScore ?? doc.hybridScore ?? null,
            title: doc.title || doc.metadata?.originalName || doc.id
          }
        })
        .filter(Boolean)
      setChunkResults(flattened)
    } catch (err) {
      const description = err?.response?.data?.error || err.message || 'Search failed'
      setSearchError(description)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col gap-4 rounded-xl border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">File diagnostics</h2>
            <p className="text-sm text-muted-foreground">
              {data?.file?.originalName || data?.file?.name || 'Untitled file'}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={searching}>
            Close
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading file details…</p>
        ) : data ? (
          <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Metadata</h3>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(data.document?.metadata || {}, null, 2)}</pre>
                {entityBadges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entityBadges.map((entity, idx) => (
                      <Badge key={`${entity.type}-${idx}`} variant="secondary" className="text-[11px]">
                        {entity.type}: {entity.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Chunk search tester</h3>
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder='Try "leave policy"'
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="button" onClick={runSearch} disabled={searching}>
                      {searching ? 'Searching…' : 'Run search'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setChunkResults(null)} disabled={searching}>
                      Clear
                    </Button>
                  </div>
                  {searchError && <p className="text-xs text-destructive">{searchError}</p>}
                </div>
                {chunkResults !== null && (
                  <div className="mt-3 space-y-2 rounded border bg-muted/30 p-2 text-xs">
                    {chunkResults.length ? (
                      chunkResults.map(chunk => (
                        <div key={chunk.id} className="rounded bg-background p-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{chunk.title}</span>
                            {chunk.metadata?.pageNumber && <Badge variant="outline">Page {chunk.metadata.pageNumber}</Badge>}
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            {chunk.content.slice(0, 240)}
                            {chunk.content.length > 240 ? '…' : ''}
                          </p>
                          {Number.isFinite(chunk.score) && (
                            <p className="mt-1 text-[11px] text-muted-foreground">Score: {chunk.score.toFixed(3)}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No matching chunks.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Indexed chunks</h3>
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredChunks.length} of {chunkVectors.length} chunks
                  </p>
                </div>
                <Input
                  placeholder="Filter chunks"
                  value={chunkFilter}
                  onChange={event => setChunkFilter(event.target.value)}
                  className="max-w-xs"
                />
              </div>
              <ScrollArea className="mt-3 h-72 rounded border">
                <div className="divide-y">
                  {filteredChunks.map(chunk => (
                    <details key={chunk.id} className="group" open={filteredChunks.length <= 3}>
                      <summary className="cursor-pointer select-none bg-muted/40 px-3 py-2 text-sm font-medium">
                        {chunk.metadata?.pageNumber ? `Page ${chunk.metadata.pageNumber}` : 'Chunk'} ·{' '}
                        {(chunk.content || '').slice(0, 64)}
                        {(chunk.content || '').length > 64 ? '…' : ''}
                      </summary>
                      <div className="space-y-3 bg-background px-3 py-3 text-xs">
                        <div>
                          <p className="font-semibold">Content</p>
                          <p className="whitespace-pre-wrap text-muted-foreground">{chunk.content || ''}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Metadata</p>
                          <pre className="rounded bg-muted/30 p-2">{JSON.stringify(chunk.metadata || {}, null, 2)}</pre>
                        </div>
                        <div>
                          <p className="font-semibold">
                            Embedding {Array.isArray(chunk.embedding) ? `(${chunk.embedding.length} dims)` : ''}
                          </p>
                          <div className="overflow-x-auto rounded bg-muted/20 p-2">
                            {Array.isArray(chunk.embedding)
                              ? chunk.embedding.join(', ')
                              : 'No embedding available'}
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                  {filteredChunks.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">No chunks match the filter.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No diagnostics available for this file.</p>
        )}
      </div>
    </div>
  )
}
