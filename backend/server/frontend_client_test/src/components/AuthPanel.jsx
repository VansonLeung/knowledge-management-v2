import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ResponseViewer } from './ResponseViewer'
import { apiRequest } from '../lib/api'

const emptyForm = {
  email: '',
  password: '',
  name: '',
  organization: ''
}

function normalizeError(error) {
  if (!error) return null
  return {
    status: error.status || 500,
    duration: error.duration || 0,
    data: error.data || { message: error.message || 'Unknown error' }
  }
}

export function AuthPanel({ apiBase, onAuthSuccess, currentUser }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)

  const canSubmit = !!apiBase && !loading && form.email && form.password && (mode === 'login' || form.name)

  const handleInput = field => event => {
    const { value } = event.target
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleModeChange = value => {
    setMode(value)
    setForm(emptyForm)
    setResponse(null)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const path = mode === 'register' ? '/auth/register' : '/auth/login'
      const body = {
        email: form.email,
        password: form.password
      }
      if (mode === 'register') {
        body.name = form.name
        if (form.organization) {
          body.organization = form.organization
        }
      }

      const result = await apiRequest({ base: apiBase, path, method: 'POST', body })
      setResponse(result)

      const token = result?.data?.data?.token
      const user = result?.data?.data?.user
      if (token && onAuthSuccess) {
        onAuthSuccess(token, user)
      }
    } catch (error) {
      setResponse(normalizeError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test authentication</CardTitle>
        <CardDescription>
          Create a user or login against the backend; successful responses populate the auth token automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList>
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="pt-4">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="authName">Name</Label>
                  <Input id="authName" value={form.name} onChange={handleInput('name')} placeholder="Jane Doe" required />
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="authEmail">Email</Label>
                <Input
                  id="authEmail"
                  type="email"
                  value={form.email}
                  onChange={handleInput('email')}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="authPassword">Password</Label>
                <Input
                  id="authPassword"
                  type="password"
                  value={form.password}
                  onChange={handleInput('password')}
                  placeholder="••••••••"
                  required
                />
              </div>
              {mode === 'register' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="authOrg">Organization (optional)</Label>
                  <Input id="authOrg" value={form.organization} onChange={handleInput('organization')} placeholder="Acme Corp" />
                </div>
              )}
              <div className="sm:col-span-2 flex items-center gap-4">
                <Button type="submit" disabled={!canSubmit}>
                  {loading ? 'Submitting…' : mode === 'register' ? 'Register user' : 'Login'}
                </Button>
                {!apiBase && <span className="text-sm text-muted-foreground">Set API base URL first.</span>}
              </div>
            </form>
          </TabsContent>
        </Tabs>

        {currentUser && (
          <div className="rounded-md border bg-muted/50 p-4 text-sm">
            <p className="font-medium">Current user</p>
            <p>{currentUser.name || currentUser.email}</p>
            <p className="text-muted-foreground">{currentUser.email}</p>
          </div>
        )}

        <ResponseViewer response={response} onClear={() => setResponse(null)} />
      </CardContent>
    </Card>
  )
}
