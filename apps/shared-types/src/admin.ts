import { z } from 'zod'

import { UserSchema } from './auth'

export const AdminUsageSummarySchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  totalCostUsd: z.number(),
  totalActions: z.number(),
  lastActionAt: z.union([z.coerce.date(), z.null()]).optional(),
  subscriptionStatus: z.string(),
  subscriptionPlan: z.string(),
  subscriptionCurrentPeriodEnd: z.union([z.coerce.date(), z.null()]).optional(),
  cancelAtPeriodEnd: z.boolean(),
  trialEndsAt: z.union([z.coerce.date(), z.null()]).optional(),
  stripeCustomerId: z.string().nullable().optional(),
  trialNotes: z.string().nullable().optional(),
})
export type AdminUsageSummary = z.infer<typeof AdminUsageSummarySchema>

export const AdminUsageResponseSchema = z.object({
  usage: z.array(AdminUsageSummarySchema),
})
export type AdminUsageResponse = z.infer<typeof AdminUsageResponseSchema>

export const AdminUpdateTrialRequestSchema = z.object({
  trialEndsAt: z.union([z.coerce.date(), z.null()]),
  trialNotes: z.string().max(500).nullable().optional(),
})
export type AdminUpdateTrialRequest = z.infer<typeof AdminUpdateTrialRequestSchema>

export const AdminUpdateTrialResponseSchema = z.object({
  user: UserSchema,
})
export type AdminUpdateTrialResponse = z.infer<typeof AdminUpdateTrialResponseSchema>
