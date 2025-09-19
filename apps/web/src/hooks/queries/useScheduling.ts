import { useQuery } from '@tanstack/react-query'
import * as schedulingClient from '@/lib/client/scheduling'

export function useSchedulingPreferences() {
  return useQuery({
    queryKey: ['scheduling', 'preferences'],
    queryFn: () => schedulingClient.getPreferences(),
    retry: false,
  })
}

export function useSchedulingSlots() {
  return useQuery({
    queryKey: ['scheduling', 'slots'],
    queryFn: () => schedulingClient.listSlots(),
    retry: false,
  })
}

