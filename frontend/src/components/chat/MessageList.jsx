import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function MessageList({ messages }) {
  return (
    <ScrollArea className="h-full px-4 py-4">
      <div className="space-y-4">
        {messages.map(message => (
          <div key={message.id} className="flex gap-3">
            <Avatar className={message.role === 'assistant' ? 'bg-primary/10' : 'bg-secondary/20'}>
              <AvatarFallback>{message.role === 'assistant' ? 'AI' : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">
                {message.role === 'assistant' ? 'Assistant' : 'You'}{' '}
                <span className="text-xs text-muted-foreground">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
              </p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{message.content}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
        )}
      </div>
    </ScrollArea>
  )
}
