import {
  TranscriptNormalizeRequestSchema,
  TranscriptUpdateRequestSchema,
} from '@content/shared-types'
import { Hono } from 'hono'
import { apiRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import {
  getProjectTranscriptForUser,
  normalizeTranscript,
  updateProjectTranscript,
} from './transcripts'

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
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const transcript = await getProjectTranscriptForUser(id, user.userId)
  return c.json({ transcript })
})

/**
 * PUT /transcripts/:id
 * Update project's transcript content via text or URL
 */
transcriptsRoutes.put('/:id', validateRequest('json', TranscriptUpdateRequestSchema), async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const data = c.req.valid('json')
  const updated = await updateProjectTranscript({ id, userId: user.userId, data })
  // Return only the original transcript in response
  const transcript =
    updated &&
    typeof updated === 'object' &&
    'transcriptOriginal' in updated &&
    typeof (updated as { transcriptOriginal?: unknown }).transcriptOriginal === 'string'
      ? (updated as { transcriptOriginal: string }).transcriptOriginal
      : null
  return c.json({ transcript })
})
