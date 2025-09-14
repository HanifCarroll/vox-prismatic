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
