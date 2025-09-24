import React, { useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { format, startOfToday } from 'date-fns'
import type { ScheduleInfo } from './utils'
import { getNextHourSlot } from './utils'

export default function ScheduleDialog({
  disabled,
  triggerTitle,
  scheduleInfo,
  onSchedule,
  onUnschedule,
  isScheduling,
  isUnscheduling,
}: {
  disabled: boolean
  triggerTitle?: string
  scheduleInfo: ScheduleInfo
  onSchedule: (date: Date) => Promise<void>
  onUnschedule: () => Promise<void>
  isScheduling: boolean
  isUnscheduling: boolean
}) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [timeValue, setTimeValue] = useState('09:00')
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const timeInputId = useId()
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  useEffect(() => {
    if (!open) {
      return
    }
    if (scheduleInfo?.scheduledAt) {
      setSelectedDate(scheduleInfo.scheduledAt)
      setTimeValue(format(scheduleInfo.scheduledAt, 'HH:mm'))
    } else {
      const nextHour = getNextHourSlot()
      const today = startOfToday()
      const nextHourDate = new Date(nextHour.getFullYear(), nextHour.getMonth(), nextHour.getDate())
      setSelectedDate(nextHourDate.getTime() === today.getTime() ? today : nextHourDate)
      setTimeValue(format(nextHour, 'HH:mm'))
    }
    setError(null)
  }, [open, scheduleInfo?.scheduledAt])

  const publishing = scheduleInfo?.status === 'publishing'
  const busy = working || isScheduling || isUnscheduling || publishing
  const canUnschedule = Boolean(scheduleInfo?.status || scheduleInfo?.scheduledAt)

  const handleOpenChange = (next: boolean) => {
    if (disabled && next) {
      return
    }
    setOpen(next)
  }

  const handleConfirm = async () => {
    if (!selectedDate || !timeValue) {
      setError('Please pick date and time')
      return
    }
    const [hourStr, minStr] = timeValue.split(':')
    const h = Number(hourStr)
    const m = Number(minStr)
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      setError('Invalid time')
      return
    }
    const date = new Date(selectedDate)
    date.setHours(h, m, 0, 0)
    if (date.getTime() <= Date.now()) {
      setError('Scheduled time must be in the future')
      return
    }
    setWorking(true)
    try {
      await onSchedule(date)
      setOpen(false)
    } catch {
      // ignore; toast handled by caller
    } finally {
      setWorking(false)
    }
  }

  const handleUnschedule = async () => {
    setWorking(true)
    try {
      await onUnschedule()
      setOpen(false)
    } finally {
      setWorking(false)
    }
  }

  const triggerHint = disabled
    ? publishing
      ? 'Publishing in progress'
      : 'Please wait for scheduling to complete'
    : triggerTitle

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || busy} title={triggerHint}>
          {scheduleInfo?.status === 'scheduled' && scheduleInfo?.scheduledAt ? 'Scheduled' : 'Schedule'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule post</DialogTitle>
          <DialogDescription>Choose a future date and time. Times use your timezone ({timezone}).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => setSelectedDate(date ?? undefined)}
            disabled={(date) => date < startOfToday()}
            initialFocus
          />
          <div className="space-y-2">
            <Label htmlFor={timeInputId}>Time</Label>
            <Input id={timeInputId} type="time" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {canUnschedule ? (
              <Button type="button" variant="ghost" onClick={handleUnschedule} disabled={busy}>
                {isUnscheduling || working ? 'Unscheduling…' : 'Unschedule'}
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Button type="button" onClick={handleConfirm} disabled={busy}>
              {isScheduling || working ? 'Scheduling…' : 'Confirm schedule'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

