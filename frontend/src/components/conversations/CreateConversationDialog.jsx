import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function CreateConversationDialog({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open) return null

  const handleSubmit = async event => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onCreate({ title, description })
      setTitle('')
      setDescription('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-lg font-semibold">New conversation</h3>
            <p className="text-sm text-muted-foreground">Organize a dedicated chat around one topic.</p>
          </div>
          <Input placeholder="Title" required value={title} onChange={event => setTitle(event.target.value)} />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={event => setDescription(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className={cn(isSubmitting && 'opacity-70')}>
              {isSubmitting ? 'Creating…' : 'Create conversation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
