import { z } from 'zod'
import { PostSchema } from './posts'

// ISO weekday: Monday=1 ... Sunday=7
export const PreferredTimeslotSchema = z.object({
  isoDayOfWeek: z.number().int().min(1).max(7),
  // HH:mm in 24h format
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  active: z.boolean().default(true),
})
export type PreferredTimeslot = z.infer<typeof PreferredTimeslotSchema>

export const SchedulingPreferencesSchema = z.object({
  timezone: z.string(), // IANA timezone; server validates
  leadTimeMinutes: z.number().int().min(0).max(1440).default(30),
})
export type SchedulingPreferences = z.infer<typeof SchedulingPreferencesSchema>

export const GetSchedulingPreferencesResponseSchema = z.object({
  preferences: SchedulingPreferencesSchema,
})
export type GetSchedulingPreferencesResponse = z.infer<
  typeof GetSchedulingPreferencesResponseSchema
>

export const UpdateSchedulingPreferencesRequestSchema = SchedulingPreferencesSchema
export type UpdateSchedulingPreferencesRequest = z.infer<
  typeof UpdateSchedulingPreferencesRequestSchema
>

export const ListTimeslotsResponseSchema = z.object({
  items: z.array(PreferredTimeslotSchema),
})
export type ListTimeslotsResponse = z.infer<typeof ListTimeslotsResponseSchema>

export const UpdateTimeslotsRequestSchema = z.object({
  items: z.array(PreferredTimeslotSchema).min(1),
})
export type UpdateTimeslotsRequest = z.infer<typeof UpdateTimeslotsRequestSchema>

export const AutoScheduleSingleResponseSchema = z.object({ post: PostSchema })
export type AutoScheduleSingleResponse = z.infer<typeof AutoScheduleSingleResponseSchema>

export const AutoScheduleProjectRequestSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
})
export type AutoScheduleProjectRequest = z.infer<typeof AutoScheduleProjectRequestSchema>

export const AutoScheduleProjectResponseSchema = z.object({
  scheduled: z.array(PostSchema),
  meta: z.object({ requested: z.number(), scheduledCount: z.number() }),
})
export type AutoScheduleProjectResponse = z.infer<typeof AutoScheduleProjectResponseSchema>

