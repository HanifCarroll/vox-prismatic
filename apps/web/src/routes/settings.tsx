import { createRoute } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import * as linkedinClient from '@/lib/client/linkedin'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSchedulingPreferences, useSchedulingSlots } from '@/hooks/queries/useScheduling'
import { useReplaceTimeslots, useUpdateSchedulingPreferences } from '@/hooks/mutations/useSchedulingMutations'
import { useMemo, useState, useEffect } from 'react'

function SettingsPage() {
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

      <section>
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

      <section>
        <h2 className="text-lg font-medium mb-3">Scheduling</h2>
        <SchedulingSettings />
      </section>
    </div>
  )
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/settings',
    component: SettingsPage,
    getParentRoute: () => parentRoute,
  })

function SchedulingSettings() {
  const prefsQuery = useSchedulingPreferences()
  const slotsQuery = useSchedulingSlots()
  const updatePrefs = useUpdateSchedulingPreferences()
  const replaceSlots = useReplaceTimeslots()

  const browserTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const [tz, setTz] = useState(prefsQuery.data?.preferences.timezone || browserTz)
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
              <Label htmlFor="tz">Timezone (IANA)</Label>
              <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} />
              <div className="text-xs text-zinc-500 mt-1">Browser detected: {browserTz}</div>
            </div>
            <div>
              <Label htmlFor="lead">Lead time (minutes)</Label>
              <Input
                id="lead"
                type="number"
                min={0}
                max={1440}
                value={lead}
                onChange={(e) => setLead(e.target.value)}
              />
              <div className="text-xs text-zinc-500 mt-1">
                Buffer before earliest eligible timeslot
              </div>
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
