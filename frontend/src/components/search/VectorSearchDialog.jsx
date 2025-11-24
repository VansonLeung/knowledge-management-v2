import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { searchKnowledgeBase } from '@/api/rag'

const SEARCH_MODES = [
  { label: 'Keyword', value: 'keyword' },
  { label: 'Vector', value: 'vector' },
  { label: 'Hybrid', value: 'hybrid' }
]

export function VectorSearchDialog({ open, onClose, defaultIndex, selectedFiles = [] }) {
  const [form, setForm] = useState({
    query: '',
    topK: 5,
    includeRelations: true,
    searchMode: 'hybrid',
    vectorWeight: 0.7,
    textWeight: 0.3,
    candidateCount: 40,
    metadata: ''
  })
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const selectedFileLabel = useMemo(() => {
    if (!selectedFiles.length) return 'Whole knowledge base'
    if (selectedFiles.length === 1) return selectedFiles[0].name
    return `${selectedFiles.length} files selected`
  }, [selectedFiles])

  const formatScore = value => (Number.isFinite(value) ? value.toFixed(3) : null)

  if (!open) return null

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const parseMetadata = () => {
    if (!form.metadata?.trim()) return undefined
    try {
      return JSON.parse(form.metadata)
    } catch (parseError) {
      throw new Error('Metadata filter must be valid JSON')
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setIsSearching(true)
    setError(null)
    setResult(null)

    try {
      const metadata = parseMetadata()
      const payload = {
        query: form.query,
        topK: Number(form.topK) || 5,
        includeRelations: form.includeRelations,
        searchMode: form.searchMode
      }

      if (defaultIndex) {
        payload.index = defaultIndex
      }

      if (metadata) {
        payload.metadata = metadata
      }

      if (form.searchMode !== 'keyword') {
        const vectorWeight = Number(form.vectorWeight)
        const textWeight = Number(form.textWeight)
        const candidateCount = Number(form.candidateCount)

        if (!Number.isNaN(vectorWeight)) payload.vectorWeight = vectorWeight
        if (!Number.isNaN(textWeight)) payload.textWeight = textWeight
        if (!Number.isNaN(candidateCount)) payload.candidateCount = candidateCount
      }

      const data = await searchKnowledgeBase(payload)
      setResult(data)
    } catch (err) {
      const description = err?.response?.data?.error || err.message || 'Search failed'
      setError(description)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-xl border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Search knowledge base</h3>
            <p className="text-sm text-muted-foreground">{selectedFileLabel}</p>
          </div>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            placeholder="What are PTO rules?"
            required
            value={form.query}
            onChange={event => updateForm('query', event.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs uppercase text-muted-foreground">Top K</label>
              <Input
                type="number"
                min={1}
                value={form.topK}
                onChange={event => updateForm('topK', event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Include relations</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.includeRelations ? 'true' : 'false'}
                onChange={event => updateForm('includeRelations', event.target.value === 'true')}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Mode</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.searchMode}
                onChange={event => updateForm('searchMode', event.target.value)}
              >
                {SEARCH_MODES.map(mode => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.searchMode !== 'keyword' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs uppercase text-muted-foreground">Vector weight</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step="0.05"
                  value={form.vectorWeight}
                  onChange={event => updateForm('vectorWeight', event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Strength of embedding similarity.</p>
              </div>
              <div>
                <label className="text-xs uppercase text-muted-foreground">Keyword weight</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step="0.05"
                  value={form.textWeight}
                  disabled={form.searchMode === 'vector'}
                  onChange={event => updateForm('textWeight', event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used for hybrid mode.</p>
              </div>
              <div>
                <label className="text-xs uppercase text-muted-foreground">Candidate window</label>
                <Input
                  type="number"
                  min={Number(form.topK) || 1}
                  value={form.candidateCount}
                  onChange={event => updateForm('candidateCount', event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Documents fetched before re-ranking.</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs uppercase text-muted-foreground">Metadata filter (JSON)</label>
            <Textarea
              rows={3}
              placeholder='{"metadata.fileId":"file-uuid"}'
              value={form.metadata}
              onChange={event => updateForm('metadata', event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSearching}>
              {isSearching ? 'Searching…' : 'Run search'}
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border p-3">
            {result.documents?.length ? (
              result.documents.map(doc => (
                <article key={doc.id} className="space-y-1 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{doc.id}</span>
                    <span>
                      {(() => {
                        const parts = []
                        const hybrid = formatScore(doc.hybridScore)
                        const vector = formatScore(doc.vectorScore)
                        if (hybrid) parts.push(`score ${hybrid}`)
                        if (vector) parts.push(`vector ${vector}`)
                        return parts.join(' · ')
                      })()}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold">{doc.title || doc.metadata?.originalName || 'Untitled'}</h4>
                  {doc.bestChunk && (
                    <p className="text-sm text-muted-foreground">
                      {doc.bestChunk.content?.slice(0, 240)}
                      {doc.bestChunk.content?.length > 240 && '…'}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No documents matched.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
