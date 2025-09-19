import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as schedulingClient from '@/lib/client/scheduling'
import { toast } from 'sonner'

export function useUpdateSchedulingPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: schedulingClient.updatePreferences,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling', 'preferences'] })
      toast.success('Preferences saved')
    },
    onError: (err: any) => {
      toast.error(err?.error || 'Failed to save preferences')
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
    onError: (err: any) => {
      toast.error(err?.error || 'Failed to update timeslots')
    },
  })
}

