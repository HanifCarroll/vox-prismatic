import { createRoute } from '@tanstack/react-router'
import type { RootRoute } from '@tanstack/react-router'

function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-zinc-600">Profile, Integrations, and Defaults.</p>
      <div className="mt-4 text-sm text-zinc-500">
        Placeholder page. Use the Integrations tab via <code>?tab=integrations</code>.
      </div>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/settings',
    component: SettingsPage,
    getParentRoute: () => parentRoute,
  })
