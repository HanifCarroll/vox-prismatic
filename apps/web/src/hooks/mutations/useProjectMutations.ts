import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as projectsClient from '@/lib/client/projects'
import { toast } from 'sonner'

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: number) => {
      await projectsClient.remove(projectId)
      return projectId
    },
    onSuccess: (projectId) => {
      // Clear related caches if any
      qc.removeQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Project deleted')
    },
  })
}

