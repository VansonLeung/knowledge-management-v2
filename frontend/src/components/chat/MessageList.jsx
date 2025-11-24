import { useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { API_BASE_URL } from '@/api/http'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function extractCitations(message) {
  const context = message?.metadata?.context
  if (!Array.isArray(context) || !context.length) return []

  const seen = new Set()
  return context
    .map(doc => {
      const fileId = doc?.metadata?.fileId
      if (!fileId) return null
      const pageNumber = doc?.bestChunk?.metadata?.pageNumber
        ?? doc?.chunks?.find(chunk => chunk?.metadata?.pageNumber)?.metadata?.pageNumber
        ?? null
      const key = `${fileId}::${pageNumber ?? 'all'}`
      if (seen.has(key)) return null
      seen.add(key)
      return {
        fileId,
        pageNumber,
        title: doc?.title || doc?.metadata?.originalName || 'Document'
      }
    })
    .filter(Boolean)
}

export function MessageList({ messages, isLoading }) {
  const viewportRef = useRef(null)
  const { token } = useAuth()

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages])

  const tokenQuery = useMemo(() => (token ? `?access_token=${encodeURIComponent(token)}` : ''), [token])

  const openCitation = (fileId, pageNumber) => {
    if (!fileId) return
    const pageAnchor = pageNumber !== null && pageNumber !== undefined ? `#page=${pageNumber}` : ''
    const url = `${API_BASE_URL}/files/${fileId}/download${tokenQuery}${pageAnchor}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-full px-4 py-4" viewportRef={viewportRef}>
        <div className="space-y-4">
        {messages.map(message => {
          const isAssistant = message.role === 'assistant'
          const citations = isAssistant ? extractCitations(message) : []
          return (
            <div key={message.id} className={cn('flex w-full', isAssistant ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'flex max-w-2xl items-start gap-3',
                  isAssistant ? 'flex-row' : 'flex-row-reverse'
                )}
              >
                <Avatar
                  className={cn(
                    'shrink-0',
                    isAssistant ? 'bg-primary/10 text-primary' : 'bg-primary text-primary-foreground'
                  )}
                >
                  <AvatarFallback>{isAssistant ? 'AI' : 'U'}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'flex flex-1 flex-col space-y-1',
                    isAssistant ? 'items-start text-left' : 'items-end text-right'
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                  </p>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm shadow-sm transition',
                      isAssistant
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    <ReactMarkdown
                      className={cn(
                        'space-y-2 [&>p]:leading-relaxed [&>p]:break-words [&_code]:rounded [&_code]:bg-background/30 [&_code]:px-1 [&_code]:py-0.5',
                        isAssistant ? '[&_a]:text-primary' : '[&_a]:text-primary-foreground underline'
                      )}
                    >
                      {message.content || ''}
                    </ReactMarkdown>
                  </div>
                  {citations.length > 0 && (
                    <div className={cn('mt-1 flex flex-wrap gap-2', isAssistant ? 'justify-start' : 'justify-end')}>
                      {citations.map(citation => {
                        const pageLabel = citation.pageNumber ?? '—'
                        return (
                          <Badge
                            key={`${citation.fileId}-${citation.pageNumber ?? 'all'}`}
                            variant="outline"
                            className="flex cursor-pointer items-center gap-1 text-xs"
                            onClick={() => openCitation(citation.fileId, citation.pageNumber)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="font-medium">{citation.title}</span>
                            <span>· Page {pageLabel}</span>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
        )}
        </div>
      </ScrollArea>
    </div>
  )
}
