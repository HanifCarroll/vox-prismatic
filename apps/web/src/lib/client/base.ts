import type { z } from 'zod'

export type ApiError = {
  error: string
  code: string
  status: number
  details?: unknown
}

// Use empty string in development to use Vite proxy (same origin)
// Use full URL in production or when VITE_API_URL is explicitly set
// Compute API base for SSR vs browser
// - Browser: use same-origin and Vite proxy (empty base)
// - SSR (Node): prefer process.env.VITE_API_URL, else Docker default
export const API_BASE = typeof window === 'undefined'
  ? // eslint-disable-next-line no-process-env, @typescript-eslint/no-explicit-any
    (((process as any)?.env?.VITE_API_URL as string | undefined) ?? 'http://api:3000')
  : ''



export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}
