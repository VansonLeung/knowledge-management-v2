import { useCallback, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { ConfigPanel, useTesterConfig } from './components/ConfigPanel'
import { AuthPanel } from './components/AuthPanel'
import { FilePanel } from './components/FilePanel'
import { GraphRagPanel } from './components/GraphRagPanel'
import { LlmPanel } from './components/LlmPanel'
import { WorkflowPanel } from './components/WorkflowPanel'
import { ResponseLogProvider } from './context/ResponseLogContext'
import { ResponseLogPanel } from './components/ResponseLogPanel'
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
    <ResponseLogProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="shrink-0 border-b border-border px-6 py-4">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-card/20 px-6 py-2">
            <div className="overflow-x-auto">
              <TabsList className="flex h-10 min-w-max items-center gap-2">
                <TabsTrigger value="config">Client config</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="graph">Graph-RAG</TabsTrigger>
                <TabsTrigger value="llm">LLM</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 py-4 lg:flex-row">
            <section className="form-pane flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/40 lg:h-full lg:w-1/2">
              <div className="h-full overflow-y-auto p-4">
                <TabsContent value="config" className="mt-0 h-full" forceMount>
                  <ConfigPanel config={config} onChange={setConfig} />
                </TabsContent>
                <TabsContent value="auth" className="mt-0 h-full" forceMount>
                  <AuthPanel apiBase={config.apiBase} onAuthSuccess={handleAuthSuccess} currentUser={currentUser} />
                </TabsContent>
                <TabsContent value="files" className="mt-0 h-full" forceMount>
                  <FilePanel apiBase={config.apiBase} token={config.authToken} />
                </TabsContent>
                <TabsContent value="graph" className="mt-0 h-full" forceMount>
                  <GraphRagPanel config={config} request={request} />
                </TabsContent>
                <TabsContent value="llm" className="mt-0 h-full" forceMount>
                  <LlmPanel request={request} apiBase={config.apiBase} token={config.authToken} />
                </TabsContent>
                <TabsContent value="workflow" className="mt-0 h-full" forceMount>
                  <WorkflowPanel request={request} />
                </TabsContent>
              </div>
            </section>

            <section className="results-pane flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card lg:w-1/2">
              <div className="h-full overflow-y-auto p-4">
                <ResponseLogPanel activeScope={activeTab} />
              </div>
            </section>
          </div>
        </Tabs>
      </div>
    </ResponseLogProvider>
  )
}

export default App
