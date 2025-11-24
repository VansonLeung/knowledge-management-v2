import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { MainLayout } from '@/components/layout/MainLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { LoadingState } from '@/components/shared/LoadingState'
import { CreateConversationDialog } from '@/components/conversations/CreateConversationDialog'
import { VectorSearchDialog } from '@/components/search/VectorSearchDialog'
import { useToast } from '@/components/ui/use-toast'
import { listConversations, createConversation, deleteConversation as deleteConversationApi, listMessages } from '@/api/conversations'
import { listFiles, uploadFiles, deleteFile } from '@/api/files'
import { streamAssistantResponse } from '@/api/chat'

function AppContent() {
  const { status, login, register, token } = useAuth()
  const { toast } = useToast()
  const [authMode, setAuthMode] = useState('login')
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  const [selectedFileIds, setSelectedFileIds] = useState([])
  const [loadingWorkspace, setLoadingWorkspace] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)

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
    setIsLoadingMessages(true)
    setMessages([])
    try {
      const data = await listMessages(conversation.id)
      setMessages(data)
    } catch (err) {
      showError(err, { title: 'Unable to fetch messages' })
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const bootstrapWorkspace = async () => {
    setLoadingWorkspace(true)
    try {
      const [conversationData, fileData] = await Promise.all([listConversations(), listFiles()])
      setConversations(conversationData)
      setFiles(fileData)

      if (!selectedConversation && conversationData.length) {
        await selectConversation(conversationData[0])
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
    if (!selectedConversation || !content.trim() || isSendingMessage || !token) return
    const conversationId = selectedConversation.id
    const targetFileIds = [...selectedFileIds]
    setIsSendingMessage(true)

    let tempAssistantId = null
    let serverAssistantId = null
    let assistantContent = ''

    const ensureAssistantPlaceholder = () => {
      if (tempAssistantId) return
      tempAssistantId = `temp-${Date.now()}`
      setMessages(prev => [
        ...prev,
        { id: tempAssistantId, role: 'assistant', content: '', metadata: { streaming: true } }
      ])
    }

    const appendToken = tokenChunk => {
      if (!tokenChunk) return
      ensureAssistantPlaceholder()
      assistantContent += tokenChunk
      setMessages(prev =>
        prev.map(msg => (msg.id === tempAssistantId ? { ...msg, content: assistantContent } : msg))
      )
    }

    try {
      await streamAssistantResponse({
        conversationId,
        token,
        payload: {
          content,
          fileIds: targetFileIds,
          searchMode: 'hybrid',
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateCount: 15
        },
        onEvent: ({ event, data }) => {
          if (event === 'user_message') {
            setMessages(prev => [...prev, data])
          } else if (event === 'token') {
            appendToken(data?.token)
          } else if (event === 'assistant_message') {
            if (tempAssistantId) {
              setMessages(prev => prev.map(msg => (msg.id === tempAssistantId ? data : msg)))
            } else {
              setMessages(prev => [...prev, data])
            }
            serverAssistantId = data.id
          } else if (event === 'error') {
            throw new Error(data?.message || 'Streaming failed')
          }
        }
      })
    } catch (err) {
      showError(err, { title: 'Message failed to send' })
      if (!serverAssistantId && tempAssistantId) {
        const placeholderId = tempAssistantId
        setMessages(prev => prev.filter(msg => msg.id !== placeholderId))
      }
    } finally {
      setIsSendingMessage(false)
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

  const handleDeleteFile = async fileIds => {
    const targets = Array.isArray(fileIds) ? fileIds : [fileIds]
    if (!targets.length) return
    try {
      await Promise.all(targets.map(id => deleteFile(id)))
      setFiles(prev => prev.filter(file => !targets.includes(file.id)))
      setSelectedFileIds(prev => prev.filter(id => !targets.includes(id)))
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

  const handleDeleteConversation = async conversation => {
    if (!conversation) return
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`Delete "${conversation.title}" and its messages? This cannot be undone.`)
    if (!confirmed) return
    try {
      await deleteConversationApi(conversation.id)
      setConversations(prev => prev.filter(item => item.id !== conversation.id))
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err) {
      showError(err, { title: 'Unable to delete conversation' })
    }
  }

  const handleClearSelection = () => setSelectedFileIds([])

  const selectedFiles = useMemo(
    () => files.filter(file => selectedFileIds.includes(file.id)),
    [files, selectedFileIds]
  )

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
            onDeleteConversation={handleDeleteConversation}
            files={files}
            onUploadFiles={handleUploadFiles}
            onDeleteFile={handleDeleteFile}
            selectedFileIds={selectedFileIds}
            onToggleFile={handleToggleFile}
            onClearSelection={handleClearSelection}
          />
        }
      >
        <div className="flex flex-1 min-h-0 flex-col">
          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onCreateConversation={() => setDialogOpen(true)}
            selectedFileIds={selectedFileIds}
            onClearFileSelection={handleClearSelection}
            selectedFiles={selectedFiles}
            isLoadingMessages={isLoadingMessages}
            isSendingMessage={isSendingMessage}
            onOpenVectorSearch={() => setSearchDialogOpen(true)}
          />
        </div>
      </MainLayout>

      <CreateConversationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateConversation}
      />

      <VectorSearchDialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        defaultIndex={null}
        selectedFiles={selectedFiles}
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
