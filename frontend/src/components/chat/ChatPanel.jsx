import { useMemo } from 'react'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilePreviewPanel } from '@/components/files/FilePreviewPanel'

export function ChatPanel({
  conversation,
  messages,
  onSendMessage,
  onCreateConversation,
  selectedFileIds,
  onClearFileSelection,
  selectedFiles,
  isLoadingMessages,
  isSendingMessage,
  onOpenVectorSearch
}) {
  const canChat = Boolean(conversation)

  const repoSummary = useMemo(() => {
    if (!selectedFileIds.length) return 'Whole knowledge base'
    if (selectedFileIds.length === 1) return '1 file selected'
    return `${selectedFileIds.length} files selected`
  }, [selectedFileIds])

  return (
    <div className="flex h-full flex-1 min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">
            {conversation ? conversation.title : 'Choose or create a conversation'}
          </h2>
          <p className="text-xs text-muted-foreground">{repoSummary}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onOpenVectorSearch}>
            Vector search
          </Button>
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

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full flex-col">
          {selectedFiles?.length > 0 && <FilePreviewPanel files={selectedFiles} />}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MessageList messages={messages} isLoading={isLoadingMessages} />
          </div>
        </div>
      </div>

      <MessageComposer
        onSend={onSendMessage}
        disabled={!canChat}
        isLoading={isLoadingMessages || isSendingMessage}
      />
    </div>
  )
}
