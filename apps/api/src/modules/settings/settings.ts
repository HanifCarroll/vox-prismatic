import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { authKeys, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
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
