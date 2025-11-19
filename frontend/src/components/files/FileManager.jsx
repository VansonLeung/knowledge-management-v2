import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function FileManager({ files, onUpload, onDelete, selectedIds, onToggleSelect }) {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleUploadClick = () => {
    inputRef.current?.click()
  }

  const handleFilesChanged = async event => {
    const selected = Array.from(event.target.files || [])
    if (!selected.length) return
    setIsUploading(true)
    try {
      await onUpload(selected)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="flex h-full flex-col border-t">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Knowledge base</p>
        <Button size="sm" variant="secondary" type="button" onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={inputRef} type="file" className="hidden" multiple onChange={handleFilesChanged} />
      </div>

      <ScrollArea className="flex-1 px-2">
        <ul className="space-y-1 pb-4">
          {files.map(file => (
            <li key={file.id}>
              <div
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition hover:bg-muted/60',
                  selectedIds.includes(file.id) && 'bg-primary/10'
                )}
              >
                <button className="flex-1 text-left" onClick={() => onToggleSelect(file.id)}>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {file.mimeType}
                  </p>
                </button>
                <Badge variant={file.status === 'ready' ? 'default' : 'outline'}>{file.status}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() => onDelete(file.id)}
                >
                  ×
                </Button>
              </div>
            </li>
          ))}
          {files.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Upload files to make them searchable during chat.
            </p>
          )}
        </ul>
      </ScrollArea>
    </div>
  )
}
