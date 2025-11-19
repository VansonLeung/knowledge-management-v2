import { useMemo } from 'react'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function ChatPanel({
  conversation,
  messages,
  onSendMessage,
  onCreateConversation,
  selectedFileIds,
  onClearFileSelection
}) {
  const canChat = Boolean(conversation)

  const repoSummary = useMemo(() => {
    if (!selectedFileIds.length) return 'Whole knowledge base'
    if (selectedFileIds.length === 1) return '1 file selected'
    return `${selectedFileIds.length} files selected`
  }, [selectedFileIds])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">
            {conversation ? conversation.title : 'Choose or create a conversation'}
          </h2>
          <p className="text-xs text-muted-foreground">{repoSummary}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedFileIds.length > 0 && (
            <Badge variant="outline" className="cursor-pointer" onClick={onClearFileSelection}>
              Clear selection
            </Badge>
          )}
          <Button type="button" variant="outline" onClick={onCreateConversation}>
            New conversation
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
      </div>

      <MessageComposer onSend={onSendMessage} disabled={!canChat} />
    </div>
  )
}
