'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitCheckin } from './actions'

type Existing = {
  id: string
  sleep_hours: number | null
  energy: number | null
  soreness: number | null
  note: string | null
} | null

export function CheckinForm({ checkDate, existing }: { checkDate: string; existing: Existing }) {
  const router = useRouter()
  const [sleep, setSleep] = useState<string>(
    existing?.sleep_hours != null ? String(existing.sleep_hours) : '',
  )
  const [energy, setEnergy] = useState<number>(existing?.energy ?? 3)
  const [soreness, setSoreness] = useState<number>(existing?.soreness ?? 2)
  const [note, setNote] = useState<string>(existing?.note ?? '')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const sleepHours = sleep.trim() === '' ? undefined : Number(sleep)
    if (
      sleepHours !== undefined &&
      (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 20)
    ) {
      toast.error('Sleep hours must be 0-20')
      return
    }

    startTransition(async () => {
      const payload: {
        checkDate: string
        sleepHours?: number
        energy?: number
        soreness?: number
        note?: string
      } = { checkDate }
      if (sleepHours !== undefined) payload.sleepHours = sleepHours
      if (energy) payload.energy = energy
      if (soreness) payload.soreness = soreness
      if (note.trim()) payload.note = note.trim()

      const res = await submitCheckin(payload)
      if (res.ok) {
        toast.success(existing ? 'Check-in updated.' : 'Logged. Good morning.')
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6 border border-border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="ci-sleep">Sleep last night (hours)</Label>
        <Input
          id="ci-sleep"
          type="number"
          step="0.25"
          min={0}
          max={20}
          inputMode="decimal"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          placeholder="e.g. 7.5"
          className="numeric text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label>Energy · {energy}/5</Label>
        <input
          type="range"
          min={1}
          max={5}
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>1 · flat</span>
          <span>3</span>
          <span>5 · buzzing</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Soreness · {soreness}/5</Label>
        <input
          type="range"
          min={1}
          max={5}
          value={soreness}
          onChange={(e) => setSoreness(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>1 · fresh</span>
          <span>3</span>
          <span>5 · beat-up</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ci-note">Note (optional)</Label>
        <Input
          id="ci-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Anything you want to remember about today?"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : existing ? 'Update check-in' : 'Submit check-in'}
      </Button>
    </form>
  )
}
