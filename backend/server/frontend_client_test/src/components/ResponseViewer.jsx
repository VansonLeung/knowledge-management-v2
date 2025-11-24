import { useEffect, useId, useMemo } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useResponseLog } from '../context/ResponseLogContext'

function formatResponsePayload(response) {
  if (!response) return ''
  if (typeof response.data === 'string') return response.data
  try {
    return JSON.stringify(response.data, null, 2)
  } catch (error) {
    return String(response.data)
  }
}

export function ResponseViewer({ title, subtitle, scope, response, onClear, inline }) {
  const pretty = useMemo(() => formatResponsePayload(response), [response])
  const hasResponse = Boolean(response)
  const entryId = useId()
  const { publish, remove } = useResponseLog()

  useEffect(() => {
    if (!hasResponse) {
      remove(entryId)
      return undefined
    }
    publish(entryId, {
      key: entryId,
      title,
      subtitle,
      scope,
      response,
      pretty,
      onClear
    })
    return () => remove(entryId)
  }, [entryId, hasResponse, title, subtitle, response, pretty, onClear, publish, remove])

  const shouldRenderInline = inline ?? false

  if (!hasResponse || !shouldRenderInline) {
    return null
  }

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

export { formatResponsePayload }
