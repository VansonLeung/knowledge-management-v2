import { useCallback, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { MainLayout } from '@/components/layout/MainLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { LoadingState } from '@/components/shared/LoadingState'
import { CreateConversationDialog } from '@/components/conversations/CreateConversationDialog'
import { useToast } from '@/components/ui/use-toast'
import {
  listConversations,
  createConversation,
  listMessages,
  createMessage
} from '@/api/conversations'
import { listFiles, uploadFiles, deleteFile } from '@/api/files'

function AppContent() {
  const { status, login, register } = useAuth()
  const { toast } = useToast()
  const [authMode, setAuthMode] = useState('login')
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  const [selectedFileIds, setSelectedFileIds] = useState([])
  const [loadingWorkspace, setLoadingWorkspace] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const showError = useCallback(
    (err, { title = 'Something went wrong', fallback } = {}) => {
      const description = err?.response?.data?.error || err?.message || fallback || 'An unexpected error occurred'
      console.error(err)
      toast({ variant: 'destructive', title, description })
    },
    [toast]
  )

  const selectConversation = async conversation => {
    setSelectedConversation(conversation)
    try {
      const data = await listMessages(conversation.id)
      setMessages(data)
    } catch (err) {
      showError(err, { title: 'Unable to fetch messages' })
    }
  }

  const bootstrapWorkspace = async () => {
    setLoadingWorkspace(true)
    try {
      const [conversationData, fileData] = await Promise.all([listConversations(), listFiles()])
      setConversations(conversationData)
      setFiles(fileData)

      if (!selectedConversation && conversationData.length) {
        selectConversation(conversationData[0])
      }
    } catch (err) {
      showError(err, { title: 'Unable to load workspace' })
    } finally {
      setLoadingWorkspace(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      bootstrapWorkspace()
    } else {
      setLoadingWorkspace(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handleSendMessage = async content => {
    if (!selectedConversation) return
    try {
      const message = await createMessage(selectedConversation.id, {
        content,
        role: 'user',
        metadata: { fileIds: selectedFileIds, scope: selectedFileIds.length ? 'files' : 'knowledge-base' }
      })
      setMessages(prev => [...prev, message])
    } catch (err) {
      showError(err, { title: 'Message failed to send' })
    }
  }

  const handleUploadFiles = async selectedFiles => {
    try {
      await uploadFiles(selectedFiles, {
        conversationIds: selectedConversation ? [selectedConversation.id] : []
      })
      const updatedFiles = await listFiles()
      setFiles(updatedFiles)
    } catch (err) {
      showError(err, { title: 'Upload failed' })
    }
  }

  const handleDeleteFile = async fileId => {
    try {
      await deleteFile(fileId)
      setFiles(prev => prev.filter(file => file.id !== fileId))
      setSelectedFileIds(prev => prev.filter(id => id !== fileId))
    } catch (err) {
      showError(err, { title: 'Unable to delete file' })
    }
  }

  const handleToggleFile = fileId => {
    setSelectedFileIds(prev => (prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]))
  }

  const handleCreateConversation = async payload => {
    try {
      const conversation = await createConversation(payload)
      setConversations(prev => [conversation, ...prev])
      await selectConversation(conversation)
    } catch (err) {
      showError(err, { title: 'Unable to create conversation' })
    }
  }

  const handleClearSelection = () => setSelectedFileIds([])

  if (status !== 'authenticated') {
    return (
      <AuthScreen
        mode={authMode}
        onSubmit={authMode === 'login' ? login : register}
        isLoading={status === 'loading'}
        switchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
      />
    )
  }

  if (loadingWorkspace) {
    return <LoadingState label="Loading your knowledge base…" />
  }

  return (
    <>
      <MainLayout
        sidebar={
          <Sidebar
            conversations={conversations}
            activeConversationId={selectedConversation?.id}
            onSelectConversation={selectConversation}
            onCreateConversation={() => setDialogOpen(true)}
            files={files}
            onUploadFiles={handleUploadFiles}
            onDeleteFile={handleDeleteFile}
            selectedFileIds={selectedFileIds}
            onToggleFile={handleToggleFile}
          />
        }
      >
        <div className="h-full">
          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onCreateConversation={() => setDialogOpen(true)}
            selectedFileIds={selectedFileIds}
            onClearFileSelection={handleClearSelection}
          />
        </div>
      </MainLayout>

      <CreateConversationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateConversation}
      />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
