export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
      <div className="space-y-2 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}
