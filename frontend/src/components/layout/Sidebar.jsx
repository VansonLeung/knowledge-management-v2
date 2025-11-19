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
  onToggleFile
}) {
  return (
    <div className="flex h-full flex-col">
      <ConversationList
        items={conversations}
        activeId={activeConversationId}
        onSelect={onSelectConversation}
        onCreate={onCreateConversation}
      />
      <FileManager
        files={files}
        onUpload={onUploadFiles}
        onDelete={onDeleteFile}
        selectedIds={selectedFileIds}
        onToggleSelect={onToggleFile}
      />
    </div>
  )
}
