#!/usr/bin/env tsx
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword, validatePasswordStrength } from '@/utils/password'

function printUsage() {
  console.log('Usage: pnpm --filter api tsx src/scripts/reset-password.ts --email <email> --password <newPassword>')
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') {
      args.email = argv[++i]
    } else if (a === '--password') {
      args.password = argv[++i]
    }
  }
  return args
}

async function main() {
  const { email, password } = parseArgs(process.argv.slice(2))
  if (!email || !password) {
    printUsage()
    process.exit(1)
  }

  const normalizedEmail = email.trim().toLowerCase()
  const strength = validatePasswordStrength(password)
  if (!strength.isValid) {
    console.error('Password does not meet requirements:')
    for (const e of strength.errors) console.error(' -', e)
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)
  const now = new Date()
  const [updated] = await db
    .update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.email, normalizedEmail))
    .returning({ id: users.id, email: users.email })

  if (!updated) {
    console.error('No user found with email:', normalizedEmail)
    process.exit(1)
  }

  console.log('✅ Password updated for user:', updated.id, updated.email)
}

main().catch((err) => {
  console.error('Failed to reset password:', err instanceof Error ? err.message : err)
  process.exit(1)
})

