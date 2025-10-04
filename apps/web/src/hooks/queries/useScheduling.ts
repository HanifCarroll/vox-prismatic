import { useSchedulingGetPreferences, useSchedulingGetSlots } from '@/api/scheduling/scheduling'

export function useSchedulingPreferences(
  initialData?: Parameters<typeof useSchedulingGetPreferences>[0],
) {
  return useSchedulingGetPreferences({ query: { retry: false, initialData } })
}

export function useSchedulingSlots(
  initialData?: Parameters<typeof useSchedulingGetSlots>[0],
) {
  return useSchedulingGetSlots({ query: { retry: false, initialData } })
}
