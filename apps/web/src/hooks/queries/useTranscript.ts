import { useQuery } from '@tanstack/react-query'
import * as transcriptsClient from '@/lib/client/transcripts'

export function useTranscript(projectId: string, initialData?: { transcript: string | null }) {
  return useQuery({
    queryKey: ['transcript', projectId],
    queryFn: () => transcriptsClient.get(projectId),
    enabled: !!projectId,
    initialData,
  })
}
