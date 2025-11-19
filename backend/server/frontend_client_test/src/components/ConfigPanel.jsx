import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

const STORAGE_KEY = 'rag_tester_config'

const defaultConfig = {
  apiBase: import.meta.env.VITE_API_BASE_URL || 'http://localhost:16001/api',
  authToken: '',
  defaultIndex: import.meta.env.VITE_DEFAULT_INDEX || 'knowledge_documents'
}

export function useTesterConfig() {
  const [config, setConfig] = useState(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    return cached ? { ...defaultConfig, ...JSON.parse(cached) } : defaultConfig
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  return [config, setConfig]
}

export function ConfigPanel({ config, onChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client configuration</CardTitle>
        <CardDescription>Values are persisted locally to your browser.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="apiBase">API base URL</Label>
          <Input
            id="apiBase"
            value={config.apiBase}
            onChange={event => onChange(prev => ({ ...prev, apiBase: event.target.value }))}
            placeholder="http://localhost:16001/api"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authToken">Authorization token (optional)</Label>
          <Input
            id="authToken"
            value={config.authToken}
            onChange={event => onChange(prev => ({ ...prev, authToken: event.target.value }))}
            placeholder="Bearer ey..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultIndex">Default index</Label>
          <Input
            id="defaultIndex"
            value={config.defaultIndex}
            onChange={event => onChange(prev => ({ ...prev, defaultIndex: event.target.value }))}
          />
        </div>
      </CardContent>
    </Card>
  )
}
