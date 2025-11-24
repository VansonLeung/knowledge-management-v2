import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Info, Trash2 } from 'lucide-react'

const STATUS_VARIANTS = {
  pending: { label: 'Queued', badge: 'outline', dot: 'bg-amber-500' },
  processing: { label: 'Processing', badge: 'outline', dot: 'bg-blue-500' },
  ready: { label: 'Ready', badge: 'default', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', badge: 'destructive', dot: 'bg-destructive' }
}

const getDisplayName = file => file?.originalName || file?.name || 'Untitled file'
const UNCATEGORIZED_VALUE = '__uncategorized__'

export function FileManager({
  files,
  onUpload,
  onDelete,
  selectedIds = [],
  onToggleSelect,
  onClearSelected,
  folders = [],
  folderScope = 'all',
  activeFolderId = null,
  onFolderChange,
  onCreateFolder,
  onMoveFile,
  onInspectFile
}) {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')

  const handleUploadClick = () => {
    inputRef.current?.click()
  }

  const confirmAndDelete = async ids => {
    if (!onDelete || !ids.length) return

    const label = ids.length === 1 ? 'this file' : `${ids.length} files`
    const shouldDelete = typeof window === 'undefined'
      ? true
      : window.confirm(`Permanently delete ${label}? This action cannot be undone.`)
    if (!shouldDelete) return

    setIsDeleting(true)
    try {
      await onDelete(ids)
    } finally {
      setIsDeleting(false)
    }
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

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return files
    return files.filter(file => getDisplayName(file).toLowerCase().includes(query))
  }, [files, search])

  const formatSize = size => `${(size / 1024).toFixed(1)} KB`

  const folderSelectValue = folderScope === 'folder'
    ? activeFolderId || 'all'
    : folderScope

  const handleFolderChange = value => {
    if (!onFolderChange) return
    if (value === 'all' || value === 'uncategorized') {
      onFolderChange(value, null)
      return
    }
    onFolderChange('folder', value)
  }

  const handleCreateFolderClick = () => {
    if (!onCreateFolder || typeof window === 'undefined') return
    const name = window.prompt('New category name')
    if (!name || !name.trim()) return
    const parentId = folderScope === 'folder' ? activeFolderId : null
    onCreateFolder({ name: name.trim(), parentId })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Knowledge base</p>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              type="button"
              onClick={() => confirmAndDelete(selectedIds)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : `Delete (${selectedIds.length})`}
            </Button>
          )}
          <Button size="sm" variant="secondary" type="button" onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
        <input ref={inputRef} type="file" className="hidden" multiple onChange={handleFilesChanged} />
      </div>

      <div className="space-y-2 px-4 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <select
              className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
              value={folderSelectValue}
              onChange={event => handleFolderChange(event.target.value)}
            >
              <option value="all">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.referencePath}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" variant="outline" onClick={handleCreateFolderClick}>
              New category
            </Button>
          </div>
        </div>
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search files"
          className="h-8 text-sm"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredFiles.length} files</span>
          {selectedIds.length > 0 && (
            <button type="button" className="text-primary" onClick={() => onClearSelected?.()}>
              Clear selection
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <ul className="space-y-1 pb-4">
          {filteredFiles.map(file => (
            <li key={file.id}>
              <div
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition hover:bg-muted/60',
                  selectedIds.includes(file.id) && 'bg-primary/10'
                )}
              >
                <button className="flex-1 text-left" onClick={() => onToggleSelect(file.id)}>
                  <p className="font-medium flex-1 text-foreground">{getDisplayName(file)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)} • {file.mimeType}
                    {file.metadata?.chunkCount && ` • ${file.metadata.chunkCount} chunks`}
                  </p>
                  {file.metadata?.folderPath && (
                    <p className="text-xs text-muted-foreground">Folder · {file.metadata.folderPath}</p>
                  )}

                  <div className="flex gap-1">
                    <Badge variant={STATUS_VARIANTS[file.status]?.badge || 'outline'} className="mr-2 flex items-center gap-1">
                      <span
                        className={cn('h-2 w-2 rounded-full', STATUS_VARIANTS[file.status]?.dot || 'bg-muted-foreground')}
                      />
                      {STATUS_VARIANTS[file.status]?.label || file.status}
                    </Badge>
                    <select
                      className="mr-2 h-7 rounded-md border border-input bg-background px-2 text-xs"
                      value={file.folderId || UNCATEGORIZED_VALUE}
                      onChange={event => {
                        const value = event.target.value
                        const nextFolderId = value === UNCATEGORIZED_VALUE ? null : value
                        onMoveFile?.(file.id, nextFolderId)
                      }}
                    >
                      <option value={UNCATEGORIZED_VALUE}>Uncategorized</option>
                      {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {folder.referencePath}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={event => {
                        event.stopPropagation()
                        onInspectFile?.(file.id)
                      }}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={event => {
                        event.stopPropagation()
                        confirmAndDelete([file.id])
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                  </div>

                </button>
              </div>
            </li>
          ))}
          {filteredFiles.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {files.length === 0 ? 'Upload files to make them searchable during chat.' : 'No matches'}
            </p>
          )}
        </ul>
      </ScrollArea>
    </div>
  )
}
