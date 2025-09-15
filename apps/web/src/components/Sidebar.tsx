import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, FolderKanban, Calendar, Settings, LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/AuthContext'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  search?: Record<string, unknown>
  disabled?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Removed stage shortcuts for a simpler MVP

// Secondary nav removed; all primary items grouped together

export default function Sidebar() {
  const { isAuthenticated, user, signOut } = useAuth()
  const routerState = useRouterState()
  const navigate = useNavigate()

  const hideOnAuthScreens =
    routerState.location.pathname === '/login' ||
    routerState.location.pathname === '/register'
  if (hideOnAuthScreens) return null

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r bg-white">
      <div className="h-full flex flex-col">
        {/* Brand + New Project */}
        <div className="px-4 py-3 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-blue-600" />
            <span className="font-semibold">Content Projects</span>
          </Link>
        </div>
        <div className="px-4">
          <Button asChild className="w-full" size="sm">
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Link>
          </Button>
        </div>

        <Separator className="my-3" />

        {/* Primary nav */}
        <nav className="px-2 py-1 space-y-1">
          {primaryNav.map((item) => (
            <SidebarLink key={item.label} item={item} />)
          )}
        </nav>

        {/* Stages removed */}

        {/* Secondary nav removed */}

        <div className="mt-auto">
          <Separator className="mb-2" />
          <div className="px-3 py-3 text-sm">
            {isAuthenticated ? (
              <div>
                <div className="font-medium">{user?.name ?? 'Account'}</div>
                <div className="text-zinc-500 text-xs truncate">
                  {user?.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full justify-start"
                  onClick={() => {
                    signOut()
                    navigate({ to: '/login' })
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="w-1/2">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild size="sm" className="w-1/2">
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  const base = 'flex items-center gap-2 rounded px-2 py-2 text-sm'
  const active = 'bg-zinc-100 text-zinc-900'
  const inactive = item.disabled
    ? 'text-zinc-400 cursor-not-allowed'
    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'

  return (
    <Link
      to={item.to}
      search={item.search as any}
      disabled={item.disabled}
      activeProps={{ className: cn(base, active) }}
      inactiveProps={{ className: cn(base, inactive) }}
      activeOptions={{ includeSearch: true }}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  )
}
