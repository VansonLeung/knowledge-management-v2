import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fetchProfile, login as loginRequest, register as registerRequest } from '@/api/auth'
import { setAuthToken } from '@/api/http'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('kb_token'))
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(token ? 'loading' : 'idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) {
      setUser(null)
      setStatus('idle')
      setAuthToken(null)
      return
    }

    setAuthToken(token)
    setStatus('loading')
    fetchProfile()
      .then(profile => {
        setUser(profile)
        setStatus('authenticated')
      })
      .catch(err => {
        console.error(err)
        setToken(null)
        localStorage.removeItem('kb_token')
        setStatus('idle')
      })
  }, [token])

  const login = async credentials => {
    setError(null)
    const result = await loginRequest(credentials)
    setToken(result.token)
    localStorage.setItem('kb_token', result.token)
    setUser(result.user)
    setStatus('authenticated')
    setAuthToken(result.token)
  }

  const register = async payload => {
    setError(null)
    const result = await registerRequest(payload)
    setToken(result.token)
    localStorage.setItem('kb_token', result.token)
    setUser(result.user)
    setStatus('authenticated')
    setAuthToken(result.token)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setStatus('idle')
    setAuthToken(null)
    localStorage.removeItem('kb_token')
  }

  const value = useMemo(
    () => ({ token, user, status, error, login, register, logout, setError }),
    [token, user, status, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
