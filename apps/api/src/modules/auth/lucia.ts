import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle'
import { Lucia } from 'lucia'
import type { Context } from 'hono'
import { db } from '@/db'
import { authKeys, authSessions, users } from '@/db/schema'
import { env } from '@/config/env'

// Lucia with Drizzle adapter
const adapter = new DrizzlePostgreSQLAdapter(db, authSessions, authKeys)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: 'auth_session',
    attributes: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  },
  getUserAttributes: (data: typeof users.$inferSelect) => {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
    }
  },
})

// Cookie helpers
function getCookie(c: Context, name: string): string | undefined {
  const header = c.req.header('Cookie') || ''
  const parts = header.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.split('=')
    if (k && k.trim() === name) {
      return decodeURIComponent(rest.join('=').trim())
    }
  }
  return undefined
}

export function setCookie(c: Context, name: string, value: string, attributes: Record<string, string | boolean> = {}) {
  const entries: string[] = []
  entries.push(`${name}=${encodeURIComponent(value)}`)
  if (attributes['Max-Age']) entries.push(`Max-Age=${attributes['Max-Age']}`)
  if (attributes.Expires) entries.push(`Expires=${attributes.Expires}`)
  if (attributes.Path !== false) entries.push(`Path=${attributes.Path || '/'}`)
  if (attributes.SameSite) entries.push(`SameSite=${attributes.SameSite}`)
  if (attributes.HttpOnly !== false) entries.push('HttpOnly')
  if (attributes.Secure || env.NODE_ENV === 'production') entries.push('Secure')
  if (attributes.Domain) entries.push(`Domain=${attributes.Domain}`)
  c.header('Set-Cookie', entries.join('; '), { append: true })
}

export function deleteCookie(c: Context, name: string, attrs: { Domain?: string } = {}) {
  setCookie(c, name, '', {
    Expires: new Date(0).toUTCString(),
    Path: '/',
    SameSite: 'Lax',
    HttpOnly: true,
    Secure: env.NODE_ENV === 'production',
    ...(attrs.Domain ? { Domain: attrs.Domain } : {}),
  })
}

export async function createSessionAndSetCookie(c: Context, userId: number) {
  const session = await lucia.createSession(userId, {})
  // Fall back to manual cookie if API surface changes
  setCookie(c, 'auth_session', session.id, {
    Path: '/',
    SameSite: 'Lax',
    HttpOnly: true,
    Secure: env.NODE_ENV === 'production',
  })
}

export function readSessionId(c: Context): string | null {
  const sid = getCookie(c, 'auth_session')
  return sid || null
}

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: typeof users.$inferSelect
  }
}

