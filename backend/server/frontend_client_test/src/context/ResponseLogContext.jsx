import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ResponseLogContext = createContext(null)

export function ResponseLogProvider({ children }) {
  const [entries, setEntries] = useState([])
  const entriesRef = useRef(new Map())

  const publish = useCallback((key, payload) => {
    if (!key || !payload) return
    entriesRef.current.set(key, { ...payload, updatedAt: Date.now() })
    setEntries(Array.from(entriesRef.current.values()).sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const remove = useCallback(key => {
    if (!key) return
    entriesRef.current.delete(key)
    setEntries(Array.from(entriesRef.current.values()).sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const clearAll = useCallback(() => {
    entriesRef.current.clear()
    setEntries([])
  }, [])

  const clearScope = useCallback(scope => {
    if (!scope) return
    Array.from(entriesRef.current.entries()).forEach(([key, value]) => {
      if (value.scope === scope) {
        entriesRef.current.delete(key)
      }
    })
    setEntries(Array.from(entriesRef.current.values()).sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const value = useMemo(
    () => ({ entries, publish, remove, clearAll, clearScope }),
    [entries, publish, remove, clearAll, clearScope]
  )

  return <ResponseLogContext.Provider value={value}>{children}</ResponseLogContext.Provider>
}

export function useResponseLog() {
  const context = useContext(ResponseLogContext)
  if (!context) {
    throw new Error('useResponseLog must be used inside a ResponseLogProvider')
  }
  return context
}
