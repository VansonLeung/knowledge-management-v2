import { useMemo } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

export function ResponseViewer({ response, onClear }) {
  const pretty = useMemo(() => {
    if (!response) return ''
    if (typeof response.data === 'string') return response.data
    try {
      return JSON.stringify(response.data, null, 2)
    } catch (error) {
      return String(response.data)
    }
  }, [response])

  if (!response) return null

  return (
    <div className="mt-4 space-y-2 rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant={response.status < 400 ? 'secondary' : 'destructive'}>HTTP {response.status}</Badge>
          <span className="text-muted-foreground">{response.duration} ms</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      {pretty && (
        <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs text-muted-foreground w-full whitespace-pre-wrap">
          {pretty}
        </pre>
      )}
    </div>
  )
}
