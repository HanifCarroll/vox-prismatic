import { useQuery } from '@tanstack/react-query'
import * as linkedinClient from '@/lib/client/linkedin'

export function useLinkedInStatus() {
  return useQuery({ queryKey: ['linkedin', 'status'], queryFn: linkedinClient.getStatus })
}

