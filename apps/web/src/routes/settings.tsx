import { createFileRoute, useRouterState, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import * as linkedinClient from '@/lib/client/linkedin'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSchedulingPreferences, useSchedulingSlots } from '@/hooks/queries/useScheduling'
import { useReplaceTimeslots, useUpdateSchedulingPreferences } from '@/hooks/mutations/useSchedulingMutations'
import { useMemo, useState, useEffect, useRef } from 'react'

function SettingsPage() {
  const routerState = useRouterState()
  const searchObj = (routerState.location as any)?.search || {}
  const tabParam = (searchObj as any).tab || new URLSearchParams(routerState.location.searchStr || '').get('tab')
  const integrationsRef = useRef<HTMLDivElement | null>(null)
  const schedulingRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const target = tabParam === 'integrations' ? integrationsRef.current : tabParam === 'scheduling' ? schedulingRef.current : null
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [tabParam])
  const { data, isLoading } = useLinkedInStatus()
  const qc = useQueryClient()

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
      const { url } = await linkedinClient.getAuthUrl()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to start LinkedIn OAuth'))
    }
  }

  const disconnect = async () => {
    try {
      await linkedinClient.disconnect()
      await qc.invalidateQueries({ queryKey: ['linkedin', 'status'] })
      toast.success('Disconnected from LinkedIn')
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to disconnect LinkedIn'))
    }
  }

  const connected = !!data?.connected

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-zinc-600">Profile, Integrations, and Defaults.</p>
      </div>

      <section ref={integrationsRef}>
        <h2 className="text-lg font-medium mb-3">Integrations</h2>
        <Card>
          <CardHeader>
            <CardTitle>LinkedIn</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
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
      </section>

      <section ref={schedulingRef}>
        <h2 className="text-lg font-medium mb-3">Scheduling</h2>
        <SchedulingSettings />
      </section>
    </div>
  )
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  beforeLoad: async () => {
    try {
      await getSession()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
})

function SchedulingSettings() {
  const prefsQuery = useSchedulingPreferences()
  const slotsQuery = useSchedulingSlots()
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
        if (!m) return { minutes: 0, label: 'UTC±00:00' }
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
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tz">Timezone</Label>
              <div className="mt-1">
                <TimezoneCombobox id="tz" value={tz} onChange={setTz} options={tzOptions} />
              </div>
              {/* Removed browser-detected hint per request */}
            </div>
            <div>
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
                className="mt-1"
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
        <CardHeader>
          <CardTitle>Preferred Timeslots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          role="combobox"
          aria-expanded={open}
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
