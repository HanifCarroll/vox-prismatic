/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Sidebar from '@/components/Sidebar'
import { Toaster } from '@/components/ui/sonner'
import appCss from '@/styles.css?url'
import * as TanStackQueryProvider from '@/integrations/tanstack-query/root-provider'
import { AuthProvider } from '@/auth/AuthContext'

export const Route = createRootRoute({
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
  component: RootComponent,
})

function RootComponent() {
  const [queryCtx] = useState(() => TanStackQueryProvider.getContext())
  return (
    <RootDocument>
      <TanStackQueryProvider.Provider {...queryCtx}>
        <AuthProvider>
          <div className="min-h-screen bg-zinc-50">
            <Sidebar />
            <main className="pl-64 relative min-h-screen">
              <div className="mx-auto max-w-6xl">
                <Outlet />
              </div>
            </main>
            <TanStackRouterDevtools position="bottom-right" />
            <Toaster richColors position="top-right" />
          </div>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </AuthProvider>
      </TanStackQueryProvider.Provider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
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
