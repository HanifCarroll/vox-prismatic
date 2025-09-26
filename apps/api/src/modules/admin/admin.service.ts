import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'

import { db } from '@/db'
import { aiUsageEvents, users } from '@/db/schema'
import { NotFoundException } from '@/utils/errors'

export async function listUsageSummaries(params: { from?: Date; to?: Date }) {
  let joinCondition = eq(aiUsageEvents.userId, users.id)
  if (params.from) {
    joinCondition = and(joinCondition, gte(aiUsageEvents.createdAt, params.from))
  }
  if (params.to) {
    joinCondition = and(joinCondition, lte(aiUsageEvents.createdAt, params.to))
  }

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      totalCostUsd: sql<number>`COALESCE(SUM(${aiUsageEvents.costUsd}), 0)::float`,
      totalActions: sql<number>`COALESCE(COUNT(${aiUsageEvents.id}), 0)::int`,
      lastActionAt: sql<Date | null>`MAX(${aiUsageEvents.createdAt})`,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
      cancelAtPeriodEnd: users.cancelAtPeriodEnd,
      trialEndsAt: users.trialEndsAt,
      stripeCustomerId: users.stripeCustomerId,
      trialNotes: users.trialNotes,
    })
    .from(users)
    .leftJoin(aiUsageEvents, joinCondition)
    .groupBy(
      users.id,
      users.email,
      users.name,
      users.subscriptionStatus,
      users.subscriptionPlan,
      users.subscriptionCurrentPeriodEnd,
      users.cancelAtPeriodEnd,
      users.trialEndsAt,
      users.stripeCustomerId,
      users.trialNotes,
    )
    .orderBy(asc(users.name))

  return rows.map((row) => ({
    ...row,
    totalCostUsd: Number(row.totalCostUsd ?? 0),
    totalActions: Number(row.totalActions ?? 0),
    lastActionAt: row.lastActionAt ?? null,
  }))
}

export async function updateUserTrial(
  userId: number,
  params: { trialEndsAt: Date | null; trialNotes?: string | null },
) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) {
    throw new NotFoundException('User not found')
  }

  const now = new Date()
  const sanitizedNotes = params.trialNotes ? params.trialNotes.trim().slice(0, 500) : null
  const updates: Partial<typeof users.$inferInsert> = {
    trialEndsAt: params.trialEndsAt,
    trialNotes: sanitizedNotes,
    updatedAt: now,
  }

  const hasActiveSubscription = !!user.stripeSubscriptionId && user.subscriptionStatus === 'active'
  const trialInFuture = params.trialEndsAt ? params.trialEndsAt.getTime() > now.getTime() : false

  if (!hasActiveSubscription) {
    if (trialInFuture) {
      updates.subscriptionStatus = 'trialing'
    } else if (!params.trialEndsAt && user.subscriptionStatus === 'trialing') {
      updates.subscriptionStatus = 'inactive'
    } else if (params.trialEndsAt && params.trialEndsAt.getTime() <= now.getTime() && user.subscriptionStatus === 'trialing') {
      updates.subscriptionStatus = 'inactive'
    }
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning()
  return updated
}
