import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as schedulingClient from '@/lib/client/scheduling'
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
  return useMutation({
    mutationFn: schedulingClient.updatePreferences,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling', 'preferences'] })
      toast.success('Preferences saved')
    },
    onError: (error: unknown) => {
      toast.error(resolveSchedulingError(error, 'Failed to save preferences'))
    },
  })
}

export function useReplaceTimeslots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: schedulingClient.replaceSlots,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling', 'slots'] })
      toast.success('Timeslots updated')
    },
    onError: (error: unknown) => {
      toast.error(resolveSchedulingError(error, 'Failed to update timeslots'))
    },
  })
}

