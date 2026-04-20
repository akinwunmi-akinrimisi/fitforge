'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileSettings } from './actions'

type Props = {
  email: string
  weightKg: number | null
  sessionsPerWeek: number | null
  timezone: string
  notificationTimes: string[]
}

export function SettingsForm({
  email,
  weightKg,
  sessionsPerWeek,
  timezone,
  notificationTimes,
}: Props) {
  const router = useRouter()
  const [weight, setWeight] = useState<string>(weightKg != null ? String(weightKg) : '')
  const [sessions, setSessions] = useState<string>(
    sessionsPerWeek != null ? String(sessionsPerWeek) : '5',
  )
  const [times, setTimes] = useState<string>(notificationTimes.join(', '))
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload: {
      weightKg?: number
      sessionsPerWeek?: number
      notificationTimes?: string[]
    } = {}
    const w = weight.trim() === '' ? undefined : Number(weight)
    if (w !== undefined) {
      if (!Number.isFinite(w) || w < 30 || w > 400) {
        toast.error('Weight must be 30-400 kg')
        return
      }
      payload.weightKg = w
    }
    const s = sessions.trim() === '' ? undefined : Number(sessions)
    if (s !== undefined) {
      if (!Number.isInteger(s) || s < 1 || s > 7) {
        toast.error('Sessions/week must be 1-7')
        return
      }
      payload.sessionsPerWeek = s
    }
    if (times.trim()) {
      const list = times
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      if (list.some((t) => !/^\d{2}:\d{2}$/.test(t))) {
        toast.error('Times must be HH:MM, comma-separated')
        return
      }
      payload.notificationTimes = list
    }
    startTransition(async () => {
      const res = await updateProfileSettings(payload)
      if (res.ok) {
        toast.success('Saved.')
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-border bg-card p-5">
      <div className="space-y-1">
        <Label>Email</Label>
        <p className="numeric text-sm text-muted-foreground">{email}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="s-weight">Current weight (kg)</Label>
          <Input
            id="s-weight"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-sessions">Sessions / week</Label>
          <Input
            id="s-sessions"
            type="number"
            min={1}
            max={7}
            inputMode="numeric"
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
            className="numeric"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="s-times">Notification times ({timezone})</Label>
        <Input
          id="s-times"
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          placeholder="10:00, 12:00, 14:00, 16:00"
        />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          HH:MM, comma-separated
        </p>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
