import { env } from '@/config/env'
import { logger } from '@/middleware/logging'
import { supabaseService } from '@/services/supabase'

let schedulerHandle: NodeJS.Timeout | null = null

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export async function publishDueScheduledPosts(args: { limit?: number } = {}) {
  const limit = Math.max(1, Math.floor(args.limit ?? parsePositiveNumber(env.POST_SCHEDULER_BATCH_SIZE, 10)))
  const nowIso = new Date().toISOString()
  // Find due posts
  const { data: due, error } = await supabaseService
    .from('posts')
    .select('id, project_id, content, status, scheduled_at, schedule_status')
    .lte('scheduled_at', nowIso)
    .eq('status', 'approved')
    .eq('schedule_status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(limit)
  if (error || !due || due.length === 0) {
    return { attempted: 0, published: 0, failed: 0 }
  }
  let attempted = 0
  let published = 0
  let failed = 0
  for (const p of due) {
    attempted++
    try {
      // Find owner
      const { data: project } = await supabaseService
        .from('content_projects')
        .select('user_id')
        .eq('id', (p as any).project_id)
        .single()
      const userId = (project as any)?.user_id as string | undefined
      if (!userId) throw new Error('owner_not_found')
      // Get LinkedIn token
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('linkedin_token, linkedin_id')
        .eq('id', userId)
        .single()
      const token = (profile as any)?.linkedin_token as string | undefined
      if (!token) throw new Error('linkedin_not_connected')
      let member = (profile as any)?.linkedin_id as string | undefined
      if (!member) {
        const infoResp = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!infoResp.ok) throw new Error('linkedin_userinfo_failed')
        const info: any = await infoResp.json()
        member = String(info.sub || '')
        if (member) await supabaseService.from('profiles').update({ linkedin_id: member }).eq('id', userId)
      }
      const content = (p as any).content as string
      const ugcPayload = {
        author: `urn:li:person:${member}`,
        lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content.slice(0, 2999) }, shareMediaCategory: 'NONE' } },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }
      const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ugcPayload),
      })
      if (!resp.ok) throw new Error('linkedin_publish_failed')
      await supabaseService
        .from('posts')
        .update({ status: 'published', published_at: new Date().toISOString(), schedule_status: null, schedule_error: null, schedule_attempted_at: new Date().toISOString() })
        .eq('id', (p as any).id)
      published++
    } catch (e) {
      failed++
      const msg = e instanceof Error ? e.message : 'unknown_error'
      await supabaseService
        .from('posts')
        .update({ schedule_status: 'failed', schedule_error: msg, schedule_attempted_at: new Date().toISOString() })
        .eq('id', (p as any).id)
    }
  }
  return { attempted, published, failed }
}

export function startPostScheduler(options?: { intervalMs?: number; batchSize?: number; enabled?: boolean }) {
  const disabledByEnv = env.POST_SCHEDULER_DISABLED === 'true'
  const enabled = options?.enabled ?? (env.NODE_ENV !== 'test' && !disabledByEnv)
  if (!enabled || schedulerHandle) return
  const intervalMs = options?.intervalMs ?? parsePositiveNumber(env.POST_SCHEDULER_INTERVAL_MS, 60000)
  schedulerHandle = setInterval(() => {
    publishDueScheduledPosts().catch((error) =>
      logger.error({ msg: 'post_scheduler_error', error: error instanceof Error ? error.message : error }),
    )
  }, intervalMs)
  publishDueScheduledPosts().catch((error) =>
    logger.error({ msg: 'post_scheduler_initial_error', error: error instanceof Error ? error.message : error }),
  )
}

export function stopPostScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
  }
}

