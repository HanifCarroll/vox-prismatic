import { useQueryClient } from '@tanstack/react-query'
import { useProjectsDelete } from '@/api/projects/projects'
import { toast } from 'sonner'

export function useDeleteProject() {
  const qc = useQueryClient()
  const deleteMutation = useProjectsDelete()

  return {
    ...deleteMutation,
    mutateAsync: async (projectId: string) => {
      await deleteMutation.mutateAsync({ id: projectId })
      // Clear related caches
      qc.removeQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Project deleted')
      return projectId
    },
  }
}
