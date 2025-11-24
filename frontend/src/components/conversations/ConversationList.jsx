import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function ConversationList({ items, activeId, onSelect, onCreate }) {
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
              <button
                type="button"
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted/60',
                  activeId === item.id && 'bg-primary/10 text-primary'
                )}
                onClick={() => onSelect(item)}
              >
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs">{item.description || 'Conversation'}</p>
                <p className="text-xs text-muted-foreground">
                  {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : 'No messages yet'}
                </p>
              </button>
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
