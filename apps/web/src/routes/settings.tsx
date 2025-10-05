import { createFileRoute, useRouterState, redirect, isRedirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import { handleAuthGuardError } from '@/lib/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import { linkedInAuth0, linkedInStatus, linkedInDisconnect } from '@/api/linked-in/linked-in'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSchedulingPreferences, useSchedulingSlots } from '@/hooks/queries/useScheduling'
import { useReplaceTimeslots, useUpdateSchedulingPreferences } from '@/hooks/mutations/useSchedulingMutations'
import { useMemo, useState, useEffect, useRef } from 'react'
import { schedulingGetPreferences, schedulingGetSlots } from '@/api/scheduling/scheduling'
import { settingsGetStyle, settingsPutStyle } from '@/api/settings/settings'
import { billingCheckoutSession, billingPortalSession } from '@/api/billing/billing'
import { useAuth } from '@/auth/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { WritingStyle, PostTypePreset } from '@/api/types'
import type { SettingsPutStyleBody } from '@/api/generated.schemas'

type ExampleEntry = { id: string; text: string }

const EMOJI_POLICY_OPTIONS: ReadonlyArray<WritingStyle['emojiPolicy']> = ['none', 'few', 'free'] as const
const POST_TYPE_OPTIONS: ReadonlyArray<PostTypePreset> = [
  'story',
  'how_to',
  'myth_bust',
  'listicle',
  'case_study',
  'announcement',
] as const

function generateExampleId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function createExampleEntry(text = ''): ExampleEntry {
  return { id: generateExampleId(), text }
}

function isEmojiPolicy(value: string): value is WritingStyle['emojiPolicy'] {
  return (EMOJI_POLICY_OPTIONS as readonly string[]).includes(value)
}

function isPostTypePreset(value: string): value is PostTypePreset {
  return (POST_TYPE_OPTIONS as readonly string[]).includes(value)
}

function SettingsPage() {
  const loaderData = Route.useLoaderData() as {
    linkedIn: Awaited<ReturnType<typeof linkedInStatus>>
    preferences: Awaited<ReturnType<typeof schedulingGetPreferences>>
    slots: Awaited<ReturnType<typeof schedulingGetSlots>>
    style: Awaited<ReturnType<typeof settingsGetStyle>>['style']
  }
  const routerState = useRouterState()
  const searchDetails = routerState.location.search
  const searchObj =
    searchDetails && typeof searchDetails === 'object' && !Array.isArray(searchDetails)
      ? (searchDetails as Record<string, unknown>)
      : undefined
  const tabParam =
    (typeof searchObj?.tab === 'string' ? searchObj.tab : undefined) ||
    new URLSearchParams(routerState.location.searchStr ?? '').get('tab')
  const integrationsRef = useRef<HTMLDivElement | null>(null)
  const styleRef = useRef<HTMLDivElement | null>(null)
  const schedulingRef = useRef<HTMLDivElement | null>(null)
  const billingRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const target =
      tabParam === 'integrations'
        ? integrationsRef.current
        : tabParam === 'style'
        ? styleRef.current
        : tabParam === 'scheduling'
        ? schedulingRef.current
        : tabParam === 'billing'
        ? billingRef.current
        : null
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [tabParam])
  const { data, isLoading } = useLinkedInStatus(loaderData.linkedIn)
  const qc = useQueryClient()
  const { user, refresh } = useAuth()
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [refreshingBilling, setRefreshingBilling] = useState(false)

  const resolveErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'error' in error) {
      const candidate = (error as { error?: unknown }).error
      if (typeof candidate === 'string') {
        return candidate
      }
    }
    return fallback
  }

  const connect = async () => {
    try {
      const { url } = await linkedInAuth0()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to start LinkedIn OAuth'))
    }
  }

  const disconnect = async () => {
    try {
      await linkedInDisconnect()
      await qc.invalidateQueries({ queryKey: ['linkedin', 'status'] })
      toast.success('Disconnected from LinkedIn')
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to disconnect LinkedIn'))
    }
  }

  const startCheckout = async () => {
    try {
      setStartingCheckout(true)
      const { url } = await billingCheckoutSession()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Unable to start checkout'))
    } finally {
      setStartingCheckout(false)
    }
  }

  const openPortal = async () => {
    try {
      if (!user?.stripeCustomerId) {
        toast.error('Billing portal is not available yet. Start a subscription first.')
        return
      }
      setOpeningPortal(true)
      const { url } = await billingPortalSession()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Unable to open billing portal'))
    } finally {
      setOpeningPortal(false)
    }
  }

  const refreshBilling = async () => {
    try {
      setRefreshingBilling(true)
      await refresh()
      toast.success('Billing status refreshed')
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to refresh billing status'))
    } finally {
      setRefreshingBilling(false)
    }
  }

  const connected = !!data?.connected

  const subscriptionStatus = user?.subscriptionStatus ?? 'inactive'
  const subscriptionLabel = subscriptionStatus.replace(/_/g, ' ')
  const subscriptionActive = subscriptionStatus === 'active'
  const hasStripeCustomer = !!user?.stripeCustomerId
  const nextRenewal = user?.subscriptionCurrentPeriodEnd ?? null
  const trialEndsAt = user?.trialEndsAt ?? null
  const trialActive = !!trialEndsAt && trialEndsAt.getTime() > Date.now()

  // Writing Style state
  const [style, setStyle] = useState<WritingStyle | null>(loaderData.style ?? null)
  const [examples, setExamples] = useState<ExampleEntry[]>(() =>
    (loaderData.style?.examples || []).map((example) => createExampleEntry(example)),
  )
  const [savingStyle, setSavingStyle] = useState(false)

  const saveStyle = async () => {
    try {
      setSavingStyle(true)
      const next: WritingStyle = {
        tone: style?.tone || undefined,
        audience: style?.audience || undefined,
        goals: style?.goals || undefined,
        emojiPolicy: style?.emojiPolicy || undefined,
        constraints: style?.constraints || undefined,
        hashtagPolicy: style?.hashtagPolicy || undefined,
        glossary: style?.glossary || undefined,
        examples: examples.map((entry) => entry.text.trim()).filter(Boolean).slice(0, 3),
        defaultPostType: style?.defaultPostType,
      }
      const payload: SettingsPutStyleBody = {
        // Backend expects a JSON-serializable structure; cast due to imperfect OpenAPI inference.
        style: next as unknown as SettingsPutStyleBody['style'],
      }
      const res = await settingsPutStyle(payload)
      const updatedStyle = (res.style as unknown as WritingStyle | null) ?? null
      setStyle(updatedStyle)
      setExamples((updatedStyle?.examples || []).map((example) => createExampleEntry(example)))
      toast.success('Writing style saved')
    } catch (err: unknown) {
      toast.error('Failed to save style')
    } finally {
      setSavingStyle(false)
    }
  }

  return (
    <div className="p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-zinc-600">Profile, Integrations, and Defaults.</p>
      </div>

      {/* Billing moved to bottom */}

      <section ref={integrationsRef}>
        <h2 id="integrations" className="text-lg font-medium mb-3 scroll-mt-24">Integrations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>LinkedIn</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between">
              <div className="text-sm text-zinc-700">
                {isLoading ? 'Checking status…' : connected ? 'Connected' : 'Not connected'}
              </div>
              <div className="flex items-center gap-2">
                {connected ? (
                  <Button variant="outline" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={connect}>
                    Connect LinkedIn
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section ref={styleRef}>
        <h2 id="writing-style" className="text-lg font-medium mb-3 scroll-mt-24">Writing Style</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Style Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Style Profile</CardTitle>
              <div className="text-sm text-zinc-600">Set your default voice, audience, and constraints.</div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <Label htmlFor="style-tone">Tone</Label>
                  <Input id="style-tone" value={style?.tone || ''} onChange={(e) => setStyle({ ...(style || {}), tone: e.target.value })} />
                </div>
                <div className="form-field">
                  <Label htmlFor="style-audience">Audience</Label>
                  <Input id="style-audience" value={style?.audience || ''} onChange={(e) => setStyle({ ...(style || {}), audience: e.target.value })} />
                </div>
                <div className="form-field">
                  <Label htmlFor="style-goals">Goals</Label>
                  <Input id="style-goals" value={style?.goals || ''} onChange={(e) => setStyle({ ...(style || {}), goals: e.target.value })} />
                </div>
                {/* Locale removed for MVP */}
                <div className="form-field">
                  <Label htmlFor="style-emoji">Emoji policy</Label>
                  <Select
                    value={style?.emojiPolicy || 'few'}
                    onValueChange={(nextPolicy) => {
                      if (!isEmojiPolicy(nextPolicy)) {
                        return
                      }
                      setStyle({ ...(style || {}), emojiPolicy: nextPolicy })
                    }}
                  >
                    <SelectTrigger id="style-emoji"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="few">Few</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <Label htmlFor="style-posttype">Default post type</Label>
                  <Select
                    value={style?.defaultPostType || 'story'}
                    onValueChange={(nextType) => {
                      if (!isPostTypePreset(nextType)) {
                        return
                      }
                      setStyle({ ...(style || {}), defaultPostType: nextType })
                    }}
                  >
                    <SelectTrigger id="style-posttype"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="how_to">How-to</SelectItem>
                      <SelectItem value="myth_bust">Myth-bust</SelectItem>
                      <SelectItem value="listicle">Listicle</SelectItem>
                      <SelectItem value="case_study">Case study</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Preferred CTA removed; model derives CTA from goals */}
              </div>
              <div className="flex items-center justify-end">
                <Button onClick={saveStyle} disabled={savingStyle}>{savingStyle ? 'Saving…' : 'Save Writing Style'}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Few-shot Examples */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Few-shot Examples</CardTitle>
              <div className="mt-1 text-sm text-zinc-600">Add up to 3 of your own posts to guide tone and structure.</div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {examples.length === 0 ? (
                <div className="rounded-md border border-dashed bg-zinc-50 p-6 text-center">
                  <div className="text-sm text-zinc-600">No examples added yet.</div>
                  <div className="mt-2 text-xs text-zinc-500">Paste a representative post (2–5 short paragraphs; hashtags at the end).</div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setExamples([createExampleEntry()])}
                    >
                      Add your first example
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {examples.map((example, idx) => (
                    <div key={example.id} className="rounded-md border bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`ex-${example.id}`}>Example {idx + 1}</Label>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span>{example.text.length}/1200</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setExamples((cur) => cur.filter((entry) => entry.id !== example.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        id={`ex-${example.id}`}
                        className="mt-2 h-40"
                        value={example.text}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 1200)
                          setExamples((cur) =>
                            cur.map((entry) => (entry.id === example.id ? { ...entry, text: val } : entry)),
                          )
                        }}
                        placeholder="Paste a representative LinkedIn post…"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={examples.length >= 3}
                      onClick={() => setExamples((cur) => (cur.length < 3 ? [...cur, createExampleEntry()] : cur))}
                    >
                      Add another example
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section ref={schedulingRef}>
        <h2 id="scheduling" className="text-lg font-medium mb-3 scroll-mt-24">Scheduling</h2>
        <SchedulingSettings initialPrefs={loaderData.preferences} initialSlots={loaderData.slots} />
      </section>

      <section ref={billingRef}>
        <h2 id="billing" className="text-lg font-medium mb-3 scroll-mt-24">Billing</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Subscription</CardTitle>
              <p className="text-sm text-zinc-600">
                Content Creation Pro · {formatCurrency(50)} per month
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm text-zinc-600">
                <div>
                  <span className="font-medium text-zinc-800">Status:</span> {subscriptionLabel}
                </div>
                {subscriptionActive && nextRenewal ? (
                  <div>Next renewal {nextRenewal.toLocaleDateString()}</div>
                ) : null}
                {trialEndsAt ? (
                  <div className={trialActive ? 'text-amber-600' : 'text-zinc-500'}>
                    Trial {trialActive ? 'ends' : 'ended'} {formatDistanceToNow(trialEndsAt, { addSuffix: true })}
                  </div>
                ) : (
                  <div className="text-zinc-500">No trial configured</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!subscriptionActive && (
                  <Button onClick={startCheckout} disabled={startingCheckout}>
                    {startingCheckout ? 'Redirecting…' : `Subscribe for ${formatCurrency(50)}/month`}
                  </Button>
                )}
                {hasStripeCustomer && (
                  <Button variant="outline" onClick={openPortal} disabled={openingPortal}>
                    {openingPortal ? 'Opening…' : 'Manage billing'}
                  </Button>
                )}
                <Button variant="ghost" onClick={refreshBilling} disabled={refreshingBilling}>
                  {refreshingBilling ? 'Refreshing…' : 'Refresh status'}
                </Button>
              </div>
              {!hasStripeCustomer && !subscriptionActive ? (
                <p className="text-xs text-zinc-500">
                  Secure checkout via Stripe. Subscriptions are $50/month with no automatic free trial.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/settings')({
  ssr: false,
  beforeLoad: async () => {
    try {
      await getSession()
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }
      const shouldRedirect = handleAuthGuardError(error)
      if (shouldRedirect) {
        throw redirect({ to: '/login' })
      }
    }
  },
  // Block rendering until required settings data is ready
  loader: async () => {
    const [linkedIn, preferences, slots, styleRes] = await Promise.all([
      linkedInStatus(),
      schedulingGetPreferences(),
      schedulingGetSlots(),
      settingsGetStyle(),
    ])
    return { linkedIn, preferences, slots, style: styleRes.style }
  },
  pendingMs: 0,
  pendingComponent: () => (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-zinc-600">Loading…</p>
      </div>
      <div className="space-y-3">
        <div className="h-28 w-full rounded-md border bg-white p-4">
          <div className="h-4 w-32 bg-zinc-200 rounded" />
          <div className="mt-4 h-3 w-56 bg-zinc-200 rounded" />
        </div>
        <div className="h-80 w-full rounded-md border bg-white p-4">
          <div className="h-4 w-40 bg-zinc-200 rounded" />
          <div className="mt-4 h-3 w-full bg-zinc-100 rounded" />
          <div className="mt-2 h-3 w-5/6 bg-zinc-100 rounded" />
          <div className="mt-2 h-3 w-2/3 bg-zinc-100 rounded" />
        </div>
      </div>
    </div>
  ),
  component: SettingsPage,
})

function SchedulingSettings({
  initialPrefs,
  initialSlots,
}: {
  initialPrefs: Awaited<ReturnType<typeof schedulingGetPreferences>>
  initialSlots: Awaited<ReturnType<typeof schedulingGetSlots>>
}) {
  const prefsQuery = useSchedulingPreferences(initialPrefs)
  const slotsQuery = useSchedulingSlots(initialSlots)
  const updatePrefs = useUpdateSchedulingPreferences()
  const replaceSlots = useReplaceTimeslots()

  const tzOptions = useMemo(() => {
    // Limited set mapped to canonical IANA zone identifiers
    const zones = [
      'Etc/GMT+12', // UTC-12:00
      'Pacific/Pago_Pago',
      'Pacific/Honolulu',
      'Pacific/Marquesas', // -09:30
      'America/Anchorage',
      'America/Los_Angeles',
      'America/Denver',
      'America/Chicago',
      'America/New_York',
      'America/Santo_Domingo',
      'America/St_Johns',
      'America/Argentina/Buenos_Aires',
      'America/Noronha',
      'Atlantic/Cape_Verde',
      'Europe/London',
      'Europe/Berlin',
      'Africa/Cairo',
      'Africa/Nairobi',
      'Asia/Tehran',
      'Asia/Dubai',
      'Asia/Kabul',
      'Asia/Karachi',
      'Asia/Kolkata',
      'Asia/Kathmandu',
      'Asia/Dhaka',
      'Asia/Yangon',
      'Asia/Bangkok',
      'Asia/Singapore',
      'Australia/Eucla',
      'Asia/Tokyo',
      'Australia/Darwin',
      'Australia/Sydney',
      'Australia/Lord_Howe',
      'Pacific/Noumea',
      'Pacific/Auckland',
      'Pacific/Chatham',
      'Pacific/Tongatapu',
      'Pacific/Kiritimati',
    ] as const

    const toOffset = (tz: string) => {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'shortOffset',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).formatToParts(new Date())
        const name = parts.find((p) => p.type === 'timeZoneName')?.value || ''
        const m = name.match(/(?:GMT|UTC)([+\-])(\d{1,2})(?::?(\d{2}))?/i)
        if (!m) {
          return { minutes: 0, label: 'UTC±00:00' }
        }
        const sign = m[1] === '-' ? -1 : 1
        const hh = Number(m[2] || '0')
        const mm = Number(m[3] || '0')
        const minutes = sign * (hh * 60 + mm)
        const hhStr = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0')
        const mmStr = String(Math.abs(minutes) % 60).padStart(2, '0')
        return { minutes, label: `UTC${sign < 0 ? '-' : '+'}${hhStr}:${mmStr}` }
      } catch {
        return { minutes: 0, label: 'UTC±00:00' }
      }
    }

    const mapped = zones.map((z) => {
      const off = toOffset(z)
      return { value: z, label: `(${off.label}) ${z}`, minutes: off.minutes }
    })
    mapped.sort((a, b) => (a.minutes - b.minutes) || a.value.localeCompare(b.value))
    return mapped
  }, [])
  const [tz, setTz] = useState<string>(prefsQuery.data?.preferences.timezone || 'Europe/London')
  const [lead, setLead] = useState(
    prefsQuery.data?.preferences.leadTimeMinutes?.toString() || '30',
  )

  // Sync local state when prefs load
  useEffect(() => {
    if (prefsQuery.data?.preferences) {
      setTz(prefsQuery.data.preferences.timezone)
      setLead(String(prefsQuery.data.preferences.leadTimeMinutes ?? 30))
    }
  }, [prefsQuery.data])

  const [newDay, setNewDay] = useState<string>('1') // Monday
  const [newTime, setNewTime] = useState<string>('09:00')
  const slots = slotsQuery.data?.items || []

  const addSlot = () => {
    if (!newTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
      toast.error('Invalid time; use HH:mm')
      return
    }
    const isoDayOfWeek = Number(newDay)
    const exists = slots.some((s) => s.isoDayOfWeek === isoDayOfWeek && s.time === newTime)
    if (exists) {
      toast.error('Duplicate slot')
      return
    }
    const updated = [...slots, { isoDayOfWeek, time: newTime, active: true }]
    replaceSlots.mutate({ items: updated })
  }

  const removeSlot = (idx: number) => {
    const updated = slots.filter((_, i) => i !== idx)
    if (updated.length === 0) {
      toast.error('At least one timeslot is required')
      return
    }
    replaceSlots.mutate({ items: updated })
  }

  const savePrefs = () => {
    const leadNum = Number(lead)
    if (!Number.isInteger(leadNum) || leadNum < 0 || leadNum > 1440) {
      toast.error('Lead time must be between 0 and 1440')
      return
    }
    updatePrefs.mutate({ timezone: tz, leadTimeMinutes: leadNum })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Preferences</CardTitle>
          <div className="text-sm text-zinc-600">Timezone and lead-time defaults for scheduling.</div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-field md:col-span-2">
              <Label htmlFor="tz">Timezone</Label>
              <TimezoneCombobox id="tz" value={tz} onChange={setTz} options={tzOptions} />
              {/* Removed browser-detected hint per request */}
            </div>
            <div className="form-field">
              <div className="flex items-center gap-2">
                <Label htmlFor="lead">Lead time (minutes)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-zinc-500" aria-label="Lead time info" />
                  </TooltipTrigger>
                  <TooltipContent>Buffer before earliest eligible timeslot</TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="lead"
                type="number"
                min={0}
                max={1440}
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                className="w-28 sm:w-36 md:w-40"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={savePrefs} disabled={updatePrefs.isPending}>
              {updatePrefs.isPending ? 'Saving…' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Preferred Timeslots</CardTitle>
          <div className="text-sm text-zinc-600">Add default days/times for auto-scheduling.</div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-2">
            <Select value={newDay} onValueChange={setNewDay}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
                <SelectItem value="7">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-36" />
            <Button size="sm" variant="secondary" onClick={addSlot} disabled={replaceSlots.isPending}>
              Add Slot
            </Button>
          </div>
          <div className="space-y-1">
            {slotsQuery.isLoading ? (
              <div className="text-sm text-zinc-600">Loading slots…</div>
            ) : slots.length === 0 ? (
              <div className="text-sm text-zinc-600">No slots configured.</div>
            ) : (
              slots.map((s, idx) => (
                <div key={`${s.isoDayOfWeek}-${s.time}`} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium mr-2">{['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.isoDayOfWeek]}</span>
                    <span className="text-zinc-700">{s.time}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeSlot(idx)} disabled={replaceSlots.isPending}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type TzOption = { value: string; label: string }

function TimezoneCombobox({
  id,
  value,
  onChange,
  options,
}: {
  id?: string
  value: string
  onChange: (val: string) => void
  options: TzOption[]
}) {
  const [open, setOpen] = useState(false)
  const display = options.find((o) => o.value === value)?.label || value || 'Select timezone'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full justify-between"
        >
          <span className="truncate max-w-[85%] text-left">{display}</span>
          <span className="text-xs text-zinc-500">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[420px] w-fit max-w-[640px] p-0">
        <Command>
          <CommandInput placeholder="Search timezone…" />
          <CommandEmpty>No timezone found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={(val) => {
                    onChange(val)
                    setOpen(false)
                  }}
                >
                  <span className="whitespace-normal break-words">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
