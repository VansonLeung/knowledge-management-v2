import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ResponseViewer } from './ResponseViewer'

function normalizeError(error) {
  if (!error) return null
  return {
    status: error.status || 500,
    duration: error.duration || 0,
    data: error.data || { message: error.message || 'Unknown error' }
  }
}

export function WorkflowPanel({ request }) {
  const [path, setPath] = useState('/rag/workflows/basic')
  const [query, setQuery] = useState('What are the onboarding steps for new CSM hires?')
  const [llmModel, setLlmModel] = useState('gpt-4o-mini')
  const [contextLimit, setContextLimit] = useState(6)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()
    setLoading(true)
    const body = {
      query,
      options: {
        maxContextItems: Number(contextLimit) || 6,
        llmModel
      }
    }
    try {
      const res = await request({ method: 'POST', path, body })
      setResponse(res)
    } catch (error) {
      setResponse(normalizeError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RAG workflow</CardTitle>
        <CardDescription>Trigger an end-to-end Graph-RAG orchestration in a single call.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflowQuery">Query</Label>
            <Textarea
              id="workflowQuery"
              value={query}
              onChange={event => setQuery(event.target.value)}
              rows={5}
              placeholder="Ask anything that should leverage documents and relations"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="workflowPath">Endpoint path</Label>
              <Input id="workflowPath" value={path} onChange={event => setPath(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflowModel">LLM model override</Label>
              <Input id="workflowModel" value={llmModel} onChange={event => setLlmModel(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflowLimit">Context items</Label>
              <Input
                id="workflowLimit"
                type="number"
                min={1}
                value={contextLimit}
                onChange={event => setContextLimit(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Running…' : 'Run workflow'}
          </Button>
        </form>
        <ResponseViewer response={response} onClear={() => setResponse(null)} />
      </CardContent>
    </Card>
  )
}
