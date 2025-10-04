import {
  TranscriptNormalizeRequestSchema,
  TranscriptUpdateRequestSchema,
} from '@content/shared-types'
import { Hono } from 'hono'
import { apiRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { normalizeTranscript } from './transcripts'
import { createUserClient } from '@/services/supabase'
import { extractSupabaseToken } from '@/services/supabase'

export const transcriptsRoutes = new Hono()

// Require auth on all endpoints
transcriptsRoutes.use('*', authMiddleware)

/**
 * POST /transcripts/preview
 * Normalize transcript from raw text or a source URL (no persistence)
 */
transcriptsRoutes.post(
  '/preview',
  apiRateLimit,
  validateRequest('json', TranscriptNormalizeRequestSchema),
  async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')
    const result = await normalizeTranscript(body, { userId: user?.userId })
    return c.json(result)
  },
)

/**
 * GET /transcripts/:id
 * Get project's transcript (ownership enforced)
 */
transcriptsRoutes.get('/:id', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) throw new Error('Missing token')
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data, error } = await userClient
    .from('content_projects')
    .select('transcript_original')
    .eq('id', id)
    .single()
  if (error) {
    return c.json({ transcript: null })
  }
  return c.json({ transcript: (data as any)?.transcript_original ?? null })
})

/**
 * PUT /transcripts/:id
 * Update project's transcript content via text or URL
 */
transcriptsRoutes.put('/:id', validateRequest('json', TranscriptUpdateRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) throw new Error('Missing token')
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const original = body.transcript
  const { transcript } = await normalizeTranscript(body, { projectId: id })
  await userClient
    .from('content_projects')
    .update({ transcript_original: original, transcript_cleaned: transcript })
    .eq('id', id)
  return c.json({ transcript: original })
})
