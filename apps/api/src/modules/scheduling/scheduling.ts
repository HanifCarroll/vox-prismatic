import { and, asc, eq } from 'drizzle-orm'
import { TZDate, tz } from '@date-fns/tz'
import { addDays, format } from 'date-fns'
import { db } from '@/db'
import {
  contentProjects,
  posts,
  userPreferredTimeslots,
  userSchedulePreferences,
} from '@/db/schema'
import {
  NotFoundException,
  UnprocessableEntityException,
  ValidationException,
} from '@/utils/errors'

function assertValidTimeZone(timeZone: string) {
  try {
    // Throws for invalid IANA timezones
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    throw new ValidationException('Invalid timezone')
  }
}

function toMinutesFromMidnight(time: string) {
  const m = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!m) throw new ValidationException('Invalid time format, expected HH:mm')
  const hh = Number(m[1])
  const mm = Number(m[2])
  return hh * 60 + mm
}

function fromMinutesToHHmm(mins: number) {
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export async function getPreferencesForUser(userId: number) {
  const pref = await db.query.userSchedulePreferences.findFirst({
    where: eq(userSchedulePreferences.userId, userId),
  })
  if (!pref) throw new NotFoundException('Scheduling preferences not found')
  return pref
}

export async function upsertPreferencesForUser(args: {
  userId: number
  timezone: string
  leadTimeMinutes: number
}) {
  const { userId, timezone, leadTimeMinutes } = args
  assertValidTimeZone(timezone)
  if (!Number.isInteger(leadTimeMinutes) || leadTimeMinutes < 0 || leadTimeMinutes > 1440) {
    throw new ValidationException('Invalid leadTimeMinutes')
  }
  const existing = await db.query.userSchedulePreferences.findFirst({
    where: eq(userSchedulePreferences.userId, userId),
  })
  const now = new Date()
  if (existing) {
    const [updated] = await db
      .update(userSchedulePreferences)
      .set({ timezone, leadTimeMinutes, updatedAt: now })
      .where(eq(userSchedulePreferences.userId, userId))
      .returning()
    return updated
  }
  const [inserted] = await db
    .insert(userSchedulePreferences)
    .values({ userId, timezone, leadTimeMinutes, createdAt: now, updatedAt: now })
    .returning()
  return inserted
}

export async function listActiveTimeslotsForUser(userId: number) {
  const rows = await db.query.userPreferredTimeslots.findMany({
    where: and(eq(userPreferredTimeslots.userId, userId), eq(userPreferredTimeslots.active, true)),
    orderBy: [asc(userPreferredTimeslots.isoDayOfWeek), asc(userPreferredTimeslots.minutesFromMidnight)],
  })
  return rows.map((r) => ({
    isoDayOfWeek: r.isoDayOfWeek,
    time: fromMinutesToHHmm(r.minutesFromMidnight),
    active: r.active ?? true,
  }))
}

export async function replaceTimeslotsForUser(args: {
  userId: number
  items: Array<{ isoDayOfWeek: number; time: string; active?: boolean }>
}) {
  const { userId } = args
  const items = (args.items || []).map((i) => ({
    isoDayOfWeek: Number(i.isoDayOfWeek),
    time: i.time,
    active: typeof i.active === 'boolean' ? i.active : true,
  }))

  if (items.length === 0) throw new ValidationException('At least one timeslot is required')
  // Validate and dedupe
  const seen = new Set<string>()
  const prepared: Array<{ isoDayOfWeek: number; minutesFromMidnight: number; active: boolean }> = []
  for (const it of items) {
    const day = it.isoDayOfWeek
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new ValidationException('isoDayOfWeek must be between 1 and 7')
    }
    const minutes = toMinutesFromMidnight(it.time)
    const key = `${day}:${minutes}`
    if (seen.has(key)) continue
    seen.add(key)
    prepared.push({ isoDayOfWeek: day, minutesFromMidnight: minutes, active: !!it.active })
  }

  // Replace-all semantics
  await db.transaction(async (tx) => {
    await tx.delete(userPreferredTimeslots).where(eq(userPreferredTimeslots.userId, userId))
    if (prepared.length > 0) {
      const now = new Date()
      await tx.insert(userPreferredTimeslots).values(
        prepared.map((p) => ({
          userId,
          isoDayOfWeek: p.isoDayOfWeek,
          minutesFromMidnight: p.minutesFromMidnight,
          active: p.active,
          createdAt: now,
          updatedAt: now,
        })),
      )
    }
  })

  return listActiveTimeslotsForUser(userId)
}

// Internal: check if a UTC datetime is taken for a user
async function isSlotTakenByUser(userId: number, dtUtc: Date) {
  const res: any = await db.execute(`
    SELECT 1
    FROM posts p
    INNER JOIN content_projects cp ON p.project_id = cp.id
    WHERE cp.user_id = ${userId}
      AND p.scheduled_at = '${dtUtc.toISOString()}'
      AND p.schedule_status IN ('scheduled', 'publishing')
    LIMIT 1
  `)
  const rows = Array.isArray(res?.rows) ? res.rows : Array.isArray(res) ? res : []
  return rows.length > 0
}

type PreferencesAndSlots = {
  timezone: string
  leadTimeMinutes: number
  slots: Array<{ isoDayOfWeek: number; minutesFromMidnight: number }>
}

async function loadPreferencesAndSlots(userId: number): Promise<PreferencesAndSlots> {
  const pref = await db.query.userSchedulePreferences.findFirst({
    where: eq(userSchedulePreferences.userId, userId),
  })
  if (!pref) throw new UnprocessableEntityException('No preferred timeslots configured')
  const activeSlots = await db.query.userPreferredTimeslots.findMany({
    where: and(eq(userPreferredTimeslots.userId, userId), eq(userPreferredTimeslots.active, true)),
    orderBy: [asc(userPreferredTimeslots.isoDayOfWeek), asc(userPreferredTimeslots.minutesFromMidnight)],
  })
  if (activeSlots.length === 0)
    throw new UnprocessableEntityException('No preferred timeslots configured')
  return {
    timezone: pref.timezone,
    leadTimeMinutes: pref.leadTimeMinutes ?? 30,
    slots: activeSlots.map((s) => ({
      isoDayOfWeek: s.isoDayOfWeek,
      minutesFromMidnight: s.minutesFromMidnight,
    })),
  }
}

function* generateCandidates(args: {
  timezone: string
  slots: Array<{ isoDayOfWeek: number; minutesFromMidnight: number }>
  fromUtc: Date
  horizonDays: number
}): Generator<Date> {
  const { timezone, slots, fromUtc, horizonDays } = args
  for (let d = 0; d <= horizonDays; d++) {
    const date = addDays(fromUtc, d)
    const isoDay = Number(format(date, 'i', { in: tz(timezone) })) // 1..7 (ISO Monday=1)
    for (const s of slots) {
      if (s.isoDayOfWeek !== isoDay) continue
      const hh = Math.floor(s.minutesFromMidnight / 60)
      const mm = s.minutesFromMidnight % 60
      const dateStr = format(date, 'yyyy-MM-dd', { in: tz(timezone) })
      const [y, m, dStr] = dateStr.split('-')
      const year = Number(y)
      const monthIndex = Number(m) - 1
      const day = Number(dStr)
      const zoned = TZDate.tz(timezone, year, monthIndex, day, hh, mm, 0, 0)
      const utc = new Date(zoned.valueOf())
      utc.setSeconds(0, 0)
      if (utc.getTime() > fromUtc.getTime()) {
        yield utc
      }
    }
  }
}

export async function findNextFreeSlotsForUser(args: {
  userId: number
  count: number
  // If provided, search strictly after this UTC time; otherwise uses now + lead time
  sinceUtc?: Date
  horizonDays?: number
}) {
  const { userId } = args
  const count = Math.max(1, Math.floor(args.count))
  const horizonDays = Math.max(1, Math.min(120, Math.floor(args.horizonDays ?? 60)))

  const pref = await loadPreferencesAndSlots(userId)
  const base = args.sinceUtc ? args.sinceUtc.getTime() : Date.now() + pref.leadTimeMinutes * 60 * 1000
  const fromUtc = new Date(base)

  const selected: Date[] = []
  const gen = generateCandidates({
    timezone: pref.timezone,
    slots: pref.slots,
    fromUtc,
    horizonDays,
  })

  for (const candidate of gen) {
    const taken = await isSlotTakenByUser(userId, candidate)
    if (!taken) {
      selected.push(candidate)
      if (selected.length >= count) break
    }
  }

  return selected
}
