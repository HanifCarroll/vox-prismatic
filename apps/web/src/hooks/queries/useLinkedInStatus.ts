import { useLinkedInStatus as useLinkedInStatusOrval } from '@/api/linked-in/linked-in'

export function useLinkedInStatus(initialData?: { connected: boolean }) {
  return useLinkedInStatusOrval({
    query: {
      initialData,
    },
  })
}
