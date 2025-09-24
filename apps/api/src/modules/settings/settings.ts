import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { authKeys, users, userStyleProfiles } from '@/db/schema'
import { ConflictException, NotFoundException, ValidationException } from '@/utils/errors'
import { hashPassword, validatePasswordStrength, verifyPassword } from '@/utils/password'

export async function getProfile(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')
  return user
}

export async function updateProfile(userId: number, data: { name?: string; email?: string }) {
  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() }
  if (typeof data.name !== 'undefined') updates.name = data.name
  if (typeof data.email !== 'undefined') updates.email = data.email.trim().toLowerCase()

  try {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning()
    return updated
  } catch (error: any) {
    const code = error?.code || error?.cause?.code
    if (code === '23505' || /duplicate key/i.test(String(error?.message))) {
      throw new ConflictException('Email already registered')
    }
    throw error
  }
}

export async function updatePassword(
  userId: number,
  data: { currentPassword: string; newPassword: string },
) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')

  const emailKeyId = `email:${user.email.toLowerCase()}`
  const key = await db.query.authKeys.findFirst({ where: eq(authKeys.id, emailKeyId) })
  const matches = !!key?.hashedPassword && (await verifyPassword(data.currentPassword, key.hashedPassword))
  if (!matches) throw new ValidationException('Current password is incorrect')

  const strength = validatePasswordStrength(data.newPassword)
  if (!strength.isValid) {
    throw new ValidationException('Password does not meet requirements', {
      errors: strength.errors,
    })
  }

  const passwordHash = await hashPassword(data.newPassword)
  await db
    .update(authKeys)
    .set({ hashedPassword: passwordHash, updatedAt: new Date() })
    .where(eq(authKeys.id, emailKeyId))
  // return updated user profile
  const updatedUser = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!updatedUser) throw new NotFoundException('User not found')
  return updatedUser
}

// ========== Style Profile ==========
import type { WritingStyle } from '@content/shared-types'

export async function getStyleProfile(userId: number): Promise<WritingStyle | null> {
  const row = await db.query.userStyleProfiles.findFirst({ where: eq(userStyleProfiles.userId, userId) })
  if (!row) return null
  const style = (row as any).style as WritingStyle
  return style || null
}

function sanitizeString(s?: string, max = 200): string | undefined {
  if (!s) return undefined
  const cleaned = s.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/```/g, ' ').trim()
  return cleaned.slice(0, max)
}

function sanitizeArray(arr?: string[], maxItems = 50, maxLen = 120): string[] | undefined {
  if (!arr) return undefined
  const out: string[] = []
  for (const item of arr) {
    const s = sanitizeString(String(item || ''), maxLen)
    if (s && s.length > 0) out.push(s)
    if (out.length >= maxItems) break
  }
  return out
}

export async function upsertStyleProfile(userId: number, style: WritingStyle): Promise<WritingStyle> {
  // Defensive sanitization to reduce prompt injection risk
  const safe: WritingStyle = {
    tone: sanitizeString(style.tone, 120),
    audience: sanitizeString(style.audience, 160),
    goals: sanitizeString(style.goals, 200),
    locale: sanitizeString(style.locale, 10),
    emojiPolicy: style.emojiPolicy,
    cta: sanitizeString(style.cta, 160),
    constraints: {
      maxParagraphs: style.constraints?.maxParagraphs,
      minParagraphs: style.constraints?.minParagraphs,
      maxSentencesPerParagraph: style.constraints?.maxSentencesPerParagraph,
      maxParagraphChars: style.constraints?.maxParagraphChars,
      maxEmojisTotal: style.constraints?.maxEmojisTotal,
      minHashtags: style.constraints?.minHashtags,
      maxHashtags: style.constraints?.maxHashtags,
    },
    hashtagPolicy: {
      required: sanitizeArray(style.hashtagPolicy?.required, 10, 52),
      allowed: sanitizeArray(style.hashtagPolicy?.allowed, 50, 52),
      banned: sanitizeArray(style.hashtagPolicy?.banned, 50, 52),
      strategy: style.hashtagPolicy?.strategy,
    },
    glossary: {
      prefer: sanitizeArray(style.glossary?.prefer, 50, 80),
      avoid: sanitizeArray(style.glossary?.avoid, 50, 80),
    },
    examples: (style.examples || [])
      .map((e) => sanitizeString(e, 1200))
      .filter((e): e is string => !!e)
      .slice(0, 3),
    defaultPostType: style.defaultPostType,
  }

  const existing = await db.query.userStyleProfiles.findFirst({ where: eq(userStyleProfiles.userId, userId) })
  if (existing) {
    const [updated] = await db
      .update(userStyleProfiles)
      .set({ style: safe as any, updatedAt: new Date() })
      .where(eq(userStyleProfiles.userId, userId))
      .returning()
    return (updated as any).style as WritingStyle
  }
  const [inserted] = await db
    .insert(userStyleProfiles)
    .values({ userId, style: safe as any })
    .returning()
  return (inserted as any).style as WritingStyle
}
