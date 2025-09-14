import { z } from 'zod'

// Error response shared shape
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  status: z.number(),
  details: z.record(z.string(), z.unknown()).optional(),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// User
export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
})
export type User = z.infer<typeof UserSchema>

// Auth: Register
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
})
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

// Auth: Login
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

// Auth responses
export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

// Minimal JWT payload used client-side (id/email/name)
export const JwtPayloadSchema = z.object({
  userId: z.number(),
  email: z.string().email(),
  name: z.string().optional(),
})
export type JwtPayload = z.infer<typeof JwtPayloadSchema>

// Projects
export const ProjectStageSchema = z.enum(['processing', 'review', 'posts', 'ready'])
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

export const PaginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

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
