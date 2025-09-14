import { createRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/lib/api'
import { useEffect, useState } from 'react'

import type { RootRoute } from '@tanstack/react-router'

type Project = {
  id: number
  title: string
  currentStage: string
}

function ProjectsPage() {

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const out = await fetchJson<{ items: Project[] }>('/api/projects')
      return out.items
    },
  })

  if (isLoading) return <div className="p-6">Loading projects…</div>
  if (error)
    return (
      <div className="p-6 text-red-600">Failed to load projects</div>
    )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      <ul className="space-y-2">
        {data?.map((p) => (
          <li key={p.id} className="border rounded p-3">
            <div className="font-medium">{p.title}</div>
            <div className="text-sm text-gray-600">Stage: {p.currentStage}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/projects',
    component: ProjectsPage,
    getParentRoute: () => parentRoute,
  })
