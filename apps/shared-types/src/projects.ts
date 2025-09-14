import { z } from 'zod'
import { PaginationMetaSchema } from './common'

export const ProjectStageSchema = z.enum(['processing', 'posts', 'ready'])
export type ProjectStage = z.infer<typeof ProjectStageSchema>

export const ContentProjectSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  transcript: z.string().optional().nullable(),
  currentStage: ProjectStageSchema,
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})
export type ContentProject = z.infer<typeof ContentProjectSchema>

export const CreateProjectRequestSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    sourceUrl: z.string().url('Invalid URL').optional().nullable(),
    transcript: z.string().optional().nullable(),
  })
  .refine(
    (data) => !!(data.sourceUrl && data.sourceUrl.trim()) || !!(data.transcript && data.transcript.trim()),
    {
      message: 'Either transcript or sourceUrl is required',
      path: ['transcript'],
    },
  )
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>

export const UpdateProjectStageRequestSchema = z.object({
  nextStage: ProjectStageSchema,
})
export type UpdateProjectStageRequest = z.infer<typeof UpdateProjectStageRequestSchema>

export const ProjectsListResponseSchema = z.object({
  items: z.array(ContentProjectSchema),
  meta: PaginationMetaSchema,
})
export type ProjectsListResponse = z.infer<typeof ProjectsListResponseSchema>

export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  stage: z.union([ProjectStageSchema, z.array(ProjectStageSchema)]).optional(),
  q: z.string().min(1).optional(),
})
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>

export const UpdateProjectRequestSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    sourceUrl: z.string().url('Invalid URL').optional().nullable(),
    transcript: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>
