import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'

export function MainLayout({ sidebar, children }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-80 border-r bg-card lg:flex lg:flex-col">
        {sidebar}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Chat with your documents and manage assets</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-muted/30">{children}</main>
      </div>
    </div>
  )
}
