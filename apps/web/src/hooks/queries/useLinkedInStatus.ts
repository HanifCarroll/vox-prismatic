import { useQuery } from '@tanstack/react-query'
import * as linkedinClient from '@/lib/client/linkedin'

export function useLinkedInStatus(initialData?: { connected: boolean }) {
  return useQuery({
    queryKey: ['linkedin', 'status'],
    queryFn: linkedinClient.getStatus,
    initialData,
  })
}
