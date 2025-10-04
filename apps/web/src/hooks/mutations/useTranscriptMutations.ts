import { useQueryClient } from '@tanstack/react-query'
import { useTranscriptsPut } from '@/api/transcripts/transcripts'
import { toast } from 'sonner'

export function useUpdateTranscript(projectId: string) {
  const qc = useQueryClient()
  const updateMutation = useTranscriptsPut()

  return {
    ...updateMutation,
    mutate: (transcript: string) => {
      updateMutation.mutate(
        { id: projectId, data: { transcript } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['transcript', projectId] })
            toast.success('Transcript updated')
          },
        }
      )
    },
  }
}
