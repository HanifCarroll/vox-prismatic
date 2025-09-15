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
import { useState } from 'react'
import ProjectDeleteButton from '@/components/ProjectDeleteButton'

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
  const [items, setItems] = useState<Project[]>(loader.items || [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-zinc-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-12 w-12 text-zinc-400 mb-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v3" />
          </svg>
          <div className="text-lg font-medium text-zinc-800">No projects yet</div>
          <p className="mt-1 max-w-md text-sm">Spin up your first project to turn a transcript or URL into a set of LinkedIn-ready posts.</p>
          <Link to="/projects/new" className="mt-4 inline-flex">
            <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">Create your first project</span>
          </Link>
        </div>
      ) : (
      <ul className="space-y-2">
        {items?.map((p) => (
          <li key={p.id} className="border rounded p-3 hover:bg-zinc-50">
            <div className="flex items-center justify-between gap-3">
              <Link to={`/projects/${p.id}`} className="font-medium text-zinc-900 truncate">
                {p.title}
              </Link>
              <div className="flex items-center gap-2">
                <StageBadge stage={p.currentStage} />
                <ProjectDeleteButton
                  projectId={p.id}
                  projectTitle={p.title}
                  onDeleted={() => setItems((cur) => cur.filter((x) => x.id !== p.id))}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      )}
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
