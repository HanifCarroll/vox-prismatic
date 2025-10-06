import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useDeleteProject } from '@/hooks/mutations/useProjectMutations'
import { useQueryClient } from '@tanstack/react-query'
import { buttonVariants } from '@/components/ui/button'
import { useRouter } from '@tanstack/react-router'

type Props = {
  projectId: string
  projectTitle?: string
  onDeleted?: () => void
  size?: 'sm' | 'default'
  variant?: 'destructive' | 'outline' | 'secondary'
  children?: ReactNode
}

export function ProjectDeleteButton({
  projectId,
  projectTitle,
  onDeleted,
  size = 'sm',
  variant = 'destructive',
  children = 'Delete',
}: Props) {
  const mutation = useDeleteProject()
  const qc = useQueryClient()
  const router = useRouter()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size={size} variant={variant} disabled={mutation.isPending}>
          {mutation.isPending ? 'Deleting…' : children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {projectTitle ? `“${projectTitle}”` : 'this project'}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the project and its generated posts. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync(projectId)
              // Invalidate any cached data that might reference projects
              qc.invalidateQueries()
              // Invalidate router loaders so projects list refetches
              try { await router.invalidate(); } catch {}
              onDeleted?.()
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ProjectDeleteButton
