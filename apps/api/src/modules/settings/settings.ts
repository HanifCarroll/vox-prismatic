import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { ConflictException, NotFoundException, ValidationException } from '@/utils/errors'
import { hashPassword, validatePasswordStrength, verifyPassword } from '@/utils/password'

export async function getProfile(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')
  const { passwordHash: _ph, ...safe } = user
  return safe
}

export async function updateProfile(userId: number, data: { name?: string; email?: string }) {
  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() }
  if (typeof data.name !== 'undefined') updates.name = data.name
  if (typeof data.email !== 'undefined') updates.email = data.email.trim().toLowerCase()

  try {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning()
    const { passwordHash: _ph, ...safe } = updated
    return safe
  } catch (error: any) {
    const code = error?.code || error?.cause?.code
    if (code === '23505' || /duplicate key/i.test(String(error?.message))) {
      throw new ConflictException('Email already registered')
    }
    throw error
  }
}

export async function updatePassword(userId: number, data: { currentPassword: string; newPassword: string }) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')

  const matches = await verifyPassword(data.currentPassword, user.passwordHash)
  if (!matches) throw new ValidationException('Current password is incorrect')

  const strength = validatePasswordStrength(data.newPassword)
  if (!strength.isValid) {
    throw new ValidationException('Password does not meet requirements', { errors: strength.errors })
  }

  const passwordHash = await hashPassword(data.newPassword)
  const [updated] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()
  const { passwordHash: _ph, ...safe } = updated
  return safe
}

