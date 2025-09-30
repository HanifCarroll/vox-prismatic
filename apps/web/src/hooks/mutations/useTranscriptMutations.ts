import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as transcriptsClient from '@/lib/client/transcripts'
import { toast } from 'sonner'

export function useUpdateTranscript(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transcript: string) => transcriptsClient.update(projectId, { transcript }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcript', projectId] })
      toast.success('Transcript updated')
    },
  })
}
