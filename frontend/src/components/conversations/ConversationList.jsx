import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export function ConversationList({ items, activeId, onSelect, onCreate, onDelete }) {
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter(item => item.title.toLowerCase().includes(query))
  }, [items, search])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conversations</p>
        <Button size="sm" type="button" onClick={onCreate}>
          New
        </Button>
      </div>
      <div className="px-4 pb-2">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by title"
          className="h-8 text-sm"
        />
      </div>
      <ScrollArea className="flex-1 px-2">
        <ul className="space-y-1 pb-4">
          {filteredItems.map(item => (
            <li key={item.id}>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/60',
                  activeId === item.id && 'bg-primary/10 text-primary'
                )}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => onSelect(item)}
                >
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-xs">{item.description || 'Conversation'}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : 'No messages yet'}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={event => {
                    event.stopPropagation()
                    onDelete?.(item)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {filteredItems.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {items.length === 0 ? 'Start a conversation to begin chatting with your documents.' : 'No matches'}
            </p>
          )}
        </ul>
      </ScrollArea>
    </div>
  )
}
