/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Sidebar from '@/components/Sidebar'
import { Toaster } from '@/components/ui/sonner'
import appCss from '@/styles.css?url'
import * as TanStackQueryProvider from '@/integrations/tanstack-query/root-provider'
import { AuthProvider } from '@/auth/AuthContext'
import type { User } from '@/auth/AuthContext'

export const Route = createRootRoute({
  // Client-only root to avoid SSR dev flakiness with Start + Vite
  ssr: false,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Content Creation' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  // Run loader on the client only; read initial user from localStorage to avoid server auth checks
  loader: async () => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('auth:user')
        if (raw) {
          const parsed = JSON.parse(raw) as unknown
          if (parsed && typeof parsed === 'object' && 'id' in parsed) {
            return { user: parsed as User }
          }
        }
      }
    } catch {}
    return { user: null as User | null }
  },
  errorComponent: RootErrorBoundary,
  component: RootComponent,
})

function RootComponent() {
  const [queryCtx] = useState(() => TanStackQueryProvider.getContext())
  const { user } = Route.useLoaderData() as { user: User | null }
  const location = useLocation()
  const pathname = location.pathname
  const isAuthScreen = pathname === '/login' || pathname === '/register'
  const isMarketingScreen = pathname === '/'
  const showAppShell = !(isAuthScreen || isMarketingScreen)
  const showTopBar = location.isLoading || location.isTransitioning
  return (
    <RootDocument>
      <TanStackQueryProvider.Provider {...queryCtx}>
        <AuthProvider initialUser={user ?? null}>
          {showAppShell ? (
            <div className="min-h-screen bg-zinc-50">
              {/* Global top loading bar during route transitions */}
              <div
                className={[
                  'fixed top-0 left-0 right-0 h-0.5 z-[1000] bg-zinc-900 transition-opacity',
                  showTopBar ? 'opacity-100' : 'opacity-0',
                ].join(' ')}
              />
              <Sidebar />
              <main className="pl-64 relative min-h-screen">
                <div className="mx-auto max-w-6xl">
                  <Outlet />
                </div>
              </main>
            </div>
          ) : (
            <Outlet />
          )}
          <TanStackRouterDevtools position="bottom-right" />
          <Toaster richColors position="top-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </AuthProvider>
      </TanStackQueryProvider.Provider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const candidate = (error as { message?: unknown }).message
    if (typeof candidate === 'string') {
      return candidate
    }
  }
  return 'Something went wrong'
}

function RootErrorBoundary({ error }: { error: unknown }) {
  const message = getErrorMessage(error)
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-md border bg-white p-6">
            <h1 className="text-lg font-semibold mb-2">An error occurred</h1>
            <div className="text-sm text-zinc-700 break-words">{message}</div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => window.location.assign('/')}
              >
                Go Home
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
