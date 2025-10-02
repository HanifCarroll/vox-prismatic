import { z } from 'zod'

// User
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  isAdmin: z.boolean().default(false),
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  subscriptionStatus: z.string(),
  subscriptionPlan: z.string(),
  subscriptionCurrentPeriodEnd: z.union([z.coerce.date(), z.null()]).optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  trialEndsAt: z.union([z.coerce.date(), z.null()]).optional(),
  trialNotes: z.string().nullable().optional(),
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
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

// Minimal client-side note:
// Sessions handled via Laravel/Sanctum; JWT not used in client.
