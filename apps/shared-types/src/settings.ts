import { z } from 'zod'
import { UserSchema } from './auth'

export const UpdateProfileRequestSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    email: z.string().email('Invalid email format').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>

export const ProfileResponseSchema = z.object({ user: UserSchema })
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>

export const UpdatePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
})
export type UpdatePasswordRequest = z.infer<typeof UpdatePasswordRequestSchema>

