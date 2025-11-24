import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { Menu } from 'lucide-react'
import { MobileSidebar } from '@/components/layout/MobileSidebar'

export function MainLayout({ sidebar, children }) {
  const { user, logout } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen min-h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-full w-80 overflow-hidden border-r bg-card lg:flex lg:flex-col">
        {sidebar}
      </aside>

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Chat with your documents and manage assets</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
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

        <main className="flex-1 min-h-0 overflow-hidden bg-muted/30">
          <div className="flex h-full flex-1 flex-col overflow-hidden">{children}</div>
        </main>
      </div>

      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        title={user?.organization || 'Workspace'}
      >
        {sidebar}
      </MobileSidebar>
    </div>
  )
}
