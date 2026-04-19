'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { endSession } from '../actions'
import type { SessionLogRow } from './types'

export function EndSession({
  sessionId,
  dateKey,
  existing,
  onChanged,
}: {
  sessionId: string
  dateKey: string
  existing: SessionLogRow | null
  onChanged?: () => void
}) {
  const [overall, setOverall] = useState<string>(
    existing?.overall_rpe ? String(existing.overall_rpe) : '',
  )
  const [notes, setNotes] = useState<string>(existing?.notes ?? '')
  const [pending, startTransition] = useTransition()
  const ended = !!existing?.ended_at

  if (ended) {
    return (
      <section className="space-y-2 border border-accent/50 bg-card p-5 text-card-foreground">
        <p className="section-eyebrow text-accent">Session complete</p>
        <p className="numeric text-xs text-muted-foreground">
          Ended {new Date(existing.ended_at!).toLocaleString()}
        </p>
        {existing?.overall_rpe != null && (
          <p className="text-sm">
            Overall RPE <span className="numeric">{existing.overall_rpe}</span>
          </p>
        )}
        {existing?.notes && (
          <p className="prose-readable text-sm text-muted-foreground">{existing.notes}</p>
        )}
      </section>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const r = overall.trim() === '' ? undefined : Number(overall)
    if (r !== undefined && (!Number.isFinite(r) || r < 1 || r > 10)) {
      toast.error('Overall RPE must be 1-10')
      return
    }

    startTransition(async () => {
      const payload: { sessionId: string; overallRpe?: number; notes?: string } = { sessionId }
      if (r !== undefined) payload.overallRpe = r
      if (notes.trim()) payload.notes = notes.trim()

      const res = await endSession(payload)
      if (res.ok) {
        toast.success('Session complete. Well done.')
        onChanged?.()
      } else {
        toast.error(res.message)
      }
    })
  }

  // Unused — intentional: page-level refresh via onChanged.
  void dateKey

  return (
    <form onSubmit={submit} className="space-y-4 border border-border bg-card p-5">
      <header className="space-y-1.5">
        <p className="section-eyebrow">Finish</p>
        <h2 className="font-display text-2xl leading-[1.05]">End session</h2>
        <p className="prose-readable text-sm text-muted-foreground">
          Optional quick reflection. You can come back to this later.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
        <div className="space-y-1 sm:w-32">
          <Label htmlFor="overall-rpe">Overall RPE</Label>
          <Input
            id="overall-rpe"
            type="number"
            min={1}
            max={10}
            inputMode="numeric"
            value={overall}
            onChange={(e) => setOverall(e.target.value)}
            className="numeric text-lg"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="session-notes">Note (optional)</Label>
          <Input
            id="session-notes"
            placeholder="Anything to remember for next time?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
          />
        </div>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'End session'}
      </Button>
    </form>
  )
}
