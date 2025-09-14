import { createRoute } from '@tanstack/react-router'
import type { RootRoute } from '@tanstack/react-router'

function CalendarPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Calendar</h1>
      <p className="text-zinc-600">Scheduling and calendar are coming soon.</p>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/calendar',
    component: CalendarPage,
    getParentRoute: () => parentRoute,
  })

