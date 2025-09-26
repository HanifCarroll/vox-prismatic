import { AdminUpdateTrialRequestSchema } from '@content/shared-types'
import { Hono } from 'hono'

import { authMiddleware } from '@/modules/auth/auth.middleware'
import { validateRequest } from '@/middleware/validation'
import { ForbiddenException, ValidationException } from '@/utils/errors'

import { listUsageSummaries, updateUserTrial } from './admin.service'

function parseDate(value: string | undefined, label: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ValidationException(`Invalid ${label} value`)
  }
  return date
}

export const adminRoutes = new Hono()

adminRoutes.use('*', authMiddleware)

adminRoutes.use('*', async (c, next) => {
  const user = c.get('user') as { isAdmin?: boolean }
  if (!user?.isAdmin) {
    throw new ForbiddenException('Admin access required')
  }
  await next()
})

adminRoutes.get('/usage', async (c) => {
  const fromParam = c.req.query('from') ?? undefined
  const toParam = c.req.query('to') ?? undefined
  const from = parseDate(fromParam, 'from')
  const to = parseDate(toParam, 'to')
  if (from && to && from.getTime() > to.getTime()) {
    throw new ValidationException('`from` must be before `to`')
  }
  const usage = await listUsageSummaries({ from, to })
  return c.json({ usage })
})

adminRoutes.patch(
  '/users/:userId/trial',
  validateRequest('json', AdminUpdateTrialRequestSchema),
  async (c) => {
    const idParam = c.req.param('userId')
    const userId = Number(idParam)
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ValidationException('Invalid user id')
    }
    const body = c.req.valid('json')
    const updated = await updateUserTrial(userId, {
      trialEndsAt: body.trialEndsAt,
      trialNotes: body.trialNotes ?? null,
    })
    return c.json({ user: updated })
  },
)
