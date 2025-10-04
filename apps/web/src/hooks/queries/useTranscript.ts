import { useTranscriptsGet } from '@/api/transcripts/transcripts'

export function useTranscript(projectId: string, initialData?: { transcript: string | null }) {
  return useTranscriptsGet(projectId, {
    query: {
      enabled: !!projectId,
      initialData,
    },
  })
}
