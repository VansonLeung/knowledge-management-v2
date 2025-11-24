import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/api/http'
import { useAuth } from '@/context/AuthContext'

const getDisplayName = file => file?.originalName || file?.name || 'Untitled file'

export function FilePreviewPanel({ files = [] }) {
  const [activeFileId, setActiveFileId] = useState(null)
  const { token } = useAuth()

  useEffect(() => {
    if (!files.length) {
      setActiveFileId(null)
      return
    }
    setActiveFileId(prev => (prev && files.some(file => file.id === prev) ? prev : files[0].id))
  }, [files])

  if (!files.length) return null

  const activeFile = files.find(file => file.id === activeFileId) || files[0]
  const openInNewTab = () => {
    if (!activeFile) return
    const tokenSuffix = token ? `?access_token=${encodeURIComponent(token)}` : ''
    const url = `${API_BASE_URL}/files/${activeFile.id}/download${tokenSuffix}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="border-b bg-muted/20 px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-2">
          {files.map(file => (
            <button
              type="button"
              key={file.id}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                activeFileId === file.id ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              )}
              onClick={() => setActiveFileId(file.id)}
            >
              {getDisplayName(file)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeFile?.metadata?.pageCount && (
            <Badge variant="outline" className="text-[11px]">
              {activeFile.metadata.pageCount} pages
            </Badge>
          )}
          {activeFile?.metadata?.folderPath && (
            <Badge variant="outline" className="text-[11px]">
              {activeFile.metadata.folderPath}
            </Badge>
          )}
          {activeFile?.metadata?.chunkCount && (
            <Badge variant="outline" className="text-[11px]">
              {activeFile.metadata.chunkCount} chunks
            </Badge>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={openInNewTab} disabled={!token}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open file
          </Button>
        </div>
      </div>
    </div>
  )
}
