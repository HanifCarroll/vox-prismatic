import { useQuery } from '@tanstack/react-query'
import * as schedulingClient from '@/lib/client/scheduling'

export function useSchedulingPreferences(
  initialData?: Awaited<ReturnType<typeof schedulingClient.getPreferences>>,
) {
  return useQuery({
    queryKey: ['scheduling', 'preferences'],
    queryFn: () => schedulingClient.getPreferences(),
    retry: false,
    initialData,
  })
}

export function useSchedulingSlots(
  initialData?: Awaited<ReturnType<typeof schedulingClient.listSlots>>,
) {
  return useQuery({
    queryKey: ['scheduling', 'slots'],
    queryFn: () => schedulingClient.listSlots(),
    retry: false,
    initialData,
  })
}
