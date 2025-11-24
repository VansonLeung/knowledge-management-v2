import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useResponseLog } from '../context/ResponseLogContext'

export function ResponseLogPanel({ activeScope }) {
  const { entries, clearAll, clearScope } = useResponseLog()
  const scopedEntries = activeScope ? entries.filter(entry => entry.scope === activeScope) : entries

  if (!scopedEntries.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        Results will show here after you run a request.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Captured responses</p>
        <Button variant="ghost" size="sm" onClick={() => (activeScope ? clearScope(activeScope) : clearAll())}>
          Clear all
        </Button>
      </div>
      {scopedEntries.map(entry => (
        <article key={entry.key} className="space-y-2 rounded-lg border bg-card/60 p-4">
          <header className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold">{entry.title || 'Response'}</p>
              {entry.subtitle && <p className="text-xs text-muted-foreground">{entry.subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {typeof entry.response?.status === 'number' && (
                <Badge variant={entry.response.status < 400 ? 'secondary' : 'destructive'}>
                  HTTP {entry.response.status}
                </Badge>
              )}
              {typeof entry.response?.duration === 'number' && <span>{entry.response.duration} ms</span>}
            </div>
          </header>
          {entry.pretty && (
            <pre className="max-h-64 overflow-auto rounded bg-muted/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
              {entry.pretty}
            </pre>
          )}
          {entry.onClear && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={entry.onClear}>
                Clear
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
