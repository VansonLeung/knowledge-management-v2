import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

const defaultForm = { name: '', email: '', password: '', organization: '' }

export function AuthScreen({ mode = 'login', onSubmit, isLoading, switchMode }) {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const handleChange = event => {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.message)
      toast({
        variant: 'destructive',
        title: isRegister ? 'Registration failed' : 'Sign-in failed',
        description: err.message || 'Please try again.'
      })
    }
  }

  const isRegister = mode === 'register'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? 'Sign up to start curating your knowledge base.' : 'Sign in to continue.'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <Input name="name" placeholder="Full name" required value={form.name} onChange={handleChange} />
          )}
          <Input name="email" type="email" placeholder="Email" required value={form.email} onChange={handleChange} />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={handleChange}
          />
          {isRegister && (
            <Input
              name="organization"
              placeholder="Organization (optional)"
              value={form.organization}
              onChange={handleChange}
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="font-medium text-primary" onClick={switchMode}>
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
