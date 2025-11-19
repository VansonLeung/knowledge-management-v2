import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function MessageComposer({ onSend, disabled, isLoading }) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitMessage = async () => {
    if (!value.trim()) return
    setIsSubmitting(true)
    try {
      await onSend(value)
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    await submitMessage()
  }

  const handleKeyDown = event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submitMessage()
    }
  }

  const isDisabled = disabled || isSubmitting || isLoading

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t bg-background p-4">
      <Textarea
        rows={3}
        placeholder="Ask a question or upload files to get started..."
        value={value}
        onChange={event => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <p>Press ⌘+Enter / Ctrl+Enter to send</p>
        <Button type="submit" disabled={isDisabled}>
          {isSubmitting ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  )
}
