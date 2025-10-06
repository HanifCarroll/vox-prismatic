import { useQueryClient } from '@tanstack/react-query'
import { useSchedulingUpdatePreferences, useSchedulingUpdateSlots } from '@/api/scheduling/scheduling'
import { toast } from 'sonner'

function resolveSchedulingError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'error' in error) {
    const candidate = (error as { error?: unknown }).error
    if (typeof candidate === 'string') {
      return candidate
    }
  }
  return fallback
}

export function useUpdateSchedulingPreferences() {
  const qc = useQueryClient()
  return useSchedulingUpdatePreferences({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['scheduling', 'preferences'] })
        toast.success('Preferences saved')
      },
      onError: (error: unknown) => {
        toast.error(resolveSchedulingError(error, 'Failed to save preferences'))
      },
    },
  })
}

export function useReplaceTimeslots() {
  const qc = useQueryClient()
  return useSchedulingUpdateSlots({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['scheduling', 'slots'] })
        toast.success('Timeslots updated')
      },
      onError: (error: unknown) => {
        toast.error(resolveSchedulingError(error, 'Failed to update timeslots'))
      },
    },
  })
}

