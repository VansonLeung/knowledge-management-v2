import { useCallback, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { ConfigPanel, useTesterConfig } from './components/ConfigPanel'
import { AuthPanel } from './components/AuthPanel'
import { FilePanel } from './components/FilePanel'
import { GraphRagPanel } from './components/GraphRagPanel'
import { LlmPanel } from './components/LlmPanel'
import { WorkflowPanel } from './components/WorkflowPanel'
import { apiRequest } from './lib/api'

function App() {
  const [config, setConfig] = useTesterConfig()
  const [activeTab, setActiveTab] = useState('graph')
  const [currentUser, setCurrentUser] = useState(null)

  const request = useCallback(
    ({ method, path, body }) =>
      apiRequest({
        base: config.apiBase,
        path,
        method,
        body,
        token: config.authToken?.trim() || undefined
      }),
    [config.apiBase, config.authToken]
  )

  const handleAuthSuccess = useCallback(
    (token, user) => {
      setConfig(prev => ({ ...prev, authToken: token }))
      setCurrentUser(user || null)
    },
    [setConfig]
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Graph-RAG toolkit</p>
          <h1 className="text-3xl font-semibold">Diagnostics console</h1>
          <p className="text-sm text-muted-foreground">
            Exercise Graph-RAG indexes, standalone LLM chat, and workflow orchestrations against the local backend.
          </p>
          {currentUser && (
            <p className="text-sm text-foreground">
              Authenticated as <span className="font-medium">{currentUser.name || currentUser.email}</span>
            </p>
          )}
        </header>

        <ConfigPanel config={config} onChange={setConfig} />
        <AuthPanel apiBase={config.apiBase} onAuthSuccess={handleAuthSuccess} currentUser={currentUser} />
        <FilePanel apiBase={config.apiBase} token={config.authToken} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="graph">Graph-RAG</TabsTrigger>
            <TabsTrigger value="llm">LLM</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>
          <TabsContent value="graph">
            <GraphRagPanel config={config} request={request} />
          </TabsContent>
          <TabsContent value="llm">
            <LlmPanel request={request} apiBase={config.apiBase} token={config.authToken} />
          </TabsContent>
          <TabsContent value="workflow">
            <WorkflowPanel request={request} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
