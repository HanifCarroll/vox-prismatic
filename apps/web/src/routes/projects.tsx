import { createRoute, Link, useLoaderData } from '@tanstack/react-router'
import * as projectsClient from '@/lib/client/projects'
import { LoadingOverlay } from '@/components/LoadingOverlay'

import type { AnyRoute } from '@tanstack/react-router'

type Project = {
  id: number
  title: string
  currentStage: string
}

import { Badge } from '@/components/ui/badge'

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' }> = {
    processing: { label: 'Processing', variant: 'secondary' },
    posts: { label: 'Posts', variant: 'default' },
    ready: { label: 'Ready', variant: 'default' },
  }
  const conf = map[stage] || { label: stage, variant: 'secondary' }
  return <Badge variant={conf.variant}>{conf.label}</Badge>
}

function ProjectsPage() {
  const loader = useLoaderData({}) as { items: Project[]; meta: { page: number; pageSize: number; total: number } }
  const data = loader.items

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      <ul className="space-y-2">
        {data?.map((p) => (
          <li key={p.id} className="border rounded p-3 hover:bg-zinc-50">
            <Link to={`/projects/${p.id}`} className="flex items-center justify-between">
              <div className="font-medium text-zinc-900 truncate">{p.title}</div>
              <StageBadge stage={p.currentStage} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/projects',
    component: ProjectsPage,
    getParentRoute: () => parentRoute,
    loader: async () => {
      const { items, meta } = await projectsClient.list()
      return { items, meta }
    },
    pendingMs: 200,
    pendingMinMs: 500,
    pendingComponent: () => <LoadingOverlay message="Loading projects…" />,
  })
