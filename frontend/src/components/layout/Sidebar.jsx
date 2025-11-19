import { ConversationList } from '@/components/conversations/ConversationList'
import { FileManager } from '@/components/files/FileManager'

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  files,
  onUploadFiles,
  onDeleteFile,
  selectedFileIds,
  onToggleFile,
  onClearSelection
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <ConversationList
          items={conversations}
          activeId={activeConversationId}
          onSelect={onSelectConversation}
          onCreate={onCreateConversation}
        />
      </div>
      <div className="flex-1 min-h-[220px] border-t">
        <FileManager
          files={files}
          onUpload={onUploadFiles}
          onDelete={onDeleteFile}
          selectedIds={selectedFileIds}
          onToggleSelect={onToggleFile}
          onClearSelected={onClearSelection}
        />
      </div>
    </div>
  )
}
