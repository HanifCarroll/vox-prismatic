import { createFileRoute, Link } from '@tanstack/react-router'
import * as projectsClient from '@/lib/client/projects'
import type { ContentProject, ProjectStage } from '@content/shared-types'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useState } from 'react'
import ProjectDeleteButton from '@/components/ProjectDeleteButton'

function StageBadge({ stage }: { stage: ProjectStage }) {
  const map: Record<ProjectStage, { label: string; variant: 'secondary' | 'default' | 'destructive' }> = {
    processing: { label: 'Processing', variant: 'secondary' },
    posts: { label: 'Posts', variant: 'default' },
    ready: { label: 'Ready', variant: 'default' },
  }
  return <Badge variant={map[stage].variant}>{map[stage].label}</Badge>
}

function ProjectsIndexPage() {
  const data = Route.useLoaderData() as Awaited<ReturnType<typeof projectsClient.list>>
  const [items, setItems] = useState<ContentProject[]>(data.items)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-zinc-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-12 w-12 text-zinc-400 mb-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-labelledby="projects-empty-icon-title"
          >
            <title id="projects-empty-icon-title">Empty projects illustration</title>
            <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            <path d="M3 7V5a 2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v3" />
          </svg>
          <div className="text-lg font-medium text-zinc-800">No projects yet</div>
          <p className="mt-1 max-w-md text-sm">Spin up your first project to turn a transcript or URL into a set of LinkedIn-ready posts.</p>
          <Link to="/projects/new" className="mt-4 inline-flex">
            <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">Create your first project</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="border rounded p-3 hover:bg-zinc-50">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: String(p.id) }}
                  className="font-medium text-zinc-900 truncate"
                >
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
              {p.currentStage === 'processing' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div>Processing…</div>
                    <div>{p.processingProgress ?? 0}%</div>
                  </div>
                  <Progress value={p.processingProgress ?? 0} className="mt-1 h-1" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Index route under /projects (renders inside the /projects layout)
export const Route = createFileRoute('/projects/')({
  // Load the projects list for the index view
  loader: async () => projectsClient.list({ page: 1, pageSize: 100 }),
  // Immediately swap to a pending UI during navigation
  pendingMs: 0,
  pendingComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      <div className="text-sm text-zinc-600">Loading projects…</div>
    </div>
  ),
  component: ProjectsIndexPage,
})
