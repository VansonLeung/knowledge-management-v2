import { useCallback, useMemo, useState } from 'react'
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

export function LlmPanel({ request, apiBase, token }) {
  const [path, setPath] = useState('/llm/chat')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [userPrompt, setUserPrompt] = useState('Summarize today\'s standup notes.')
  const [temperature, setTemperature] = useState(0.1)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [useStream, setUseStream] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [streamMeta, setStreamMeta] = useState(null)

  const headers = useMemo(() => {
    const base = {
      'Content-Type': 'application/json'
    }
    if (token) {
      base.Authorization = token.startsWith('Bearer') ? token : `Bearer ${token}`
    }
    return base
  }, [token])

  const streamUrl = useMemo(() => {
    if (!apiBase) return null
    if (path.startsWith('http')) return path
    return `${apiBase.replace(/\/$/, '')}${path}`
  }, [apiBase, path])

  const buildBody = () => ({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: Number(temperature) || 0
  })

  const handleSubmit = async event => {
    event.preventDefault()
    const body = buildBody()
    if (useStream) {
      handleStreamRequest(body)
      return
    }
    setLoading(true)
    try {
      const res = await request({ method: 'POST', path, body })
      setResponse(res)
    } catch (error) {
      setResponse(normalizeError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleStreamRequest = useCallback(
    async body => {
      if (!streamUrl) {
        setResponse(normalizeError({ status: 400, data: { message: 'Set API base URL first.' } }))
        return
      }

      setStreaming(true)
      setStreamBuffer('')
      setStreamMeta(null)
      setResponse(null)

      const started = performance.now()
      try {
        const res = await fetch(streamUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, stream: true })
        })

        if (!res.ok || !res.body) {
          const text = await res.text()
          throw { status: res.status, data: { message: text || 'Streaming request failed' } }
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let fullText = ''
        let finishReason = null
        let usage = null

        const processChunk = chunk => {
          const lines = chunk.split('\n')
          let fatalError = null
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload) continue
            let parsed
            try {
              parsed = JSON.parse(payload)
            } catch {
              console.error('Failed to parse stream payload', payload)
              continue
            }

            if (parsed.event === 'delta' && parsed.delta) {
              fullText += parsed.delta
              setStreamBuffer(prev => prev + parsed.delta)
            } else if (parsed.event === 'finish') {
              finishReason = parsed.reason || null
            } else if (parsed.event === 'end') {
              usage = parsed.usage || null
            } else if (parsed.event === 'error') {
              fatalError = new Error(parsed.message || 'Stream error')
              break
            }
          }
          if (fatalError) {
            throw fatalError
          }
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let boundary
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            processChunk(chunk)
          }
        }

        if (buffer.trim()) {
          processChunk(buffer)
        }

        const duration = Math.round(performance.now() - started)
        setStreamMeta({ finishReason, usage })
        setResponse({
          status: 200,
          duration,
          data: {
            stream: true,
            message: { role: 'assistant', content: fullText },
            usage,
            finishReason
          }
        })
      } catch (error) {
        setResponse(normalizeError(error))
      } finally {
        setStreaming(false)
      }
    },
    [headers, streamUrl]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM chat</CardTitle>
        <CardDescription>Send quick chat completion prompts against the configured backend.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="llmPath">Endpoint path</Label>
              <Input id="llmPath" value={path} onChange={event => setPath(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="llmTemp">Temperature</Label>
              <Input
                id="llmTemp"
                type="number"
                step={0.1}
                min={0}
                max={2}
                value={temperature}
                onChange={event => setTemperature(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="streamToggle"
              type="checkbox"
              className="h-4 w-4"
              checked={useStream}
              onChange={event => setUseStream(event.target.checked)}
            />
            <Label htmlFor="streamToggle" className="font-normal">
              Stream response incrementally
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System prompt</Label>
            <Textarea id="systemPrompt" value={systemPrompt} onChange={event => setSystemPrompt(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userPrompt">User prompt</Label>
            <Textarea id="userPrompt" value={userPrompt} onChange={event => setUserPrompt(event.target.value)} rows={6} />
          </div>
          <Button type="submit" disabled={loading || streaming}>
            {loading || streaming ? (useStream ? 'Streaming…' : 'Sending…') : useStream ? 'Stream prompt' : 'Send prompt'}
          </Button>
        </form>
        {useStream && (
          <div className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Live response</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-muted-foreground">{streamBuffer || 'Waiting for tokens…'}</pre>
            {streamMeta && (
              <p className="text-xs text-muted-foreground">
                Finish reason: {streamMeta.finishReason || 'unknown'}
              </p>
            )}
          </div>
        )}
        <ResponseViewer title="LLM request" scope="llm" response={response} onClear={() => setResponse(null)} />
      </CardContent>
    </Card>
  )
}
