'use client'

import { useMemo, useState, useTransition } from 'react'
import { Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExerciseDetailDrawer } from './exercise-detail-drawer'
import { RestTimer } from './rest-timer'
import { logSet, undoLastSet } from '../actions'
import { enqueueSet } from '@/lib/offline/queue'
import type { ExerciseCardData } from './types'

export function ExerciseCard({
  sessionId,
  data,
  onChanged,
}: {
  sessionId: string
  data: ExerciseCardData
  onChanged?: () => void
}) {
  const nextSetNumber = (data.setLogs.at(-1)?.set_number ?? 0) + 1
  const isComplete = nextSetNumber > data.targetSets

  const autofill = useMemo<{ weight: string; reps: string }>(() => {
    if (data.targetLoadKg != null) {
      return { weight: String(data.targetLoadKg), reps: String(data.targetRepsMin) }
    }
    if (data.previousDefault) {
      return {
        weight: data.previousDefault.weightKg != null ? String(data.previousDefault.weightKg) : '',
        reps: String(data.previousDefault.reps || data.targetRepsMin),
      }
    }
    return { weight: '', reps: String(data.targetRepsMin) }
  }, [data.targetLoadKg, data.previousDefault, data.targetRepsMin])

  const [weight, setWeight] = useState<string>(autofill.weight)
  const [reps, setReps] = useState<string>(autofill.reps)
  const [rpe, setRpe] = useState<string>('')
  const [showTimer, setShowTimer] = useState<boolean>(false)
  const [pending, startTransition] = useTransition()

  const topCues = data.library?.posture_cues.slice(0, 2) ?? []

  function onLog(e: React.FormEvent) {
    e.preventDefault()
    const w = weight.trim() === '' ? null : Number(weight)
    const r = Number(reps)
    if (w !== null && !Number.isFinite(w)) {
      toast.error('Weight must be a number')
      return
    }
    if (!Number.isFinite(r)) {
      toast.error('Reps must be a number')
      return
    }
    const r2 = rpe.trim() === '' ? undefined : Number(rpe)
    if (r2 !== undefined && (!Number.isFinite(r2) || r2 < 1 || r2 > 10)) {
      toast.error('RPE must be 1-10')
      return
    }

    startTransition(async () => {
      const payload: {
        sessionId: string
        sessionExerciseId: string
        setNumber: number
        weightKg: number | null
        reps: number
        rpe?: number
      } = {
        sessionId,
        sessionExerciseId: data.id,
        setNumber: nextSetNumber,
        weightKg: w,
        reps: r,
      }
      if (r2 !== undefined) payload.rpe = r2

      // Offline-first: if we already know we're offline, queue and skip the
      // round-trip. Otherwise try the server action; if it throws (network),
      // fall back to the queue.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await enqueueSet(payload)
        toast.success(`Set ${nextSetNumber} queued (offline)`)
        setShowTimer(true)
        return
      }

      let res: Awaited<ReturnType<typeof logSet>>
      try {
        res = await logSet(payload)
      } catch {
        await enqueueSet(payload)
        toast.success(`Set ${nextSetNumber} queued (network fault)`)
        setShowTimer(true)
        return
      }
      if (res.ok) {
        toast.success(`Set ${nextSetNumber} logged`)
        setShowTimer(true)
        onChanged?.()
      } else {
        toast.error(res.message)
      }
    })
  }

  function onUndo() {
    startTransition(async () => {
      const res = await undoLastSet(data.id)
      if (res.ok) {
        toast.success(
          res.data.deletedSetNumber
            ? `Set ${res.data.deletedSetNumber} removed`
            : 'Nothing to undo',
        )
        setShowTimer(false)
        onChanged?.()
      } else {
        toast.error(res.message)
      }
    })
  }

  const targetReadout = `${data.targetSets} × ${
    data.targetRepsMin === data.targetRepsMax
      ? data.targetRepsMin
      : `${data.targetRepsMin}–${data.targetRepsMax}`
  }${data.targetLoadKg != null ? ` @ ${data.targetLoadKg} kg` : ' @ RPE 7'}`

  return (
    <article
      className={cn(
        'space-y-4 border border-border bg-card p-5 text-card-foreground',
        isComplete && 'border-accent/50',
      )}
      aria-labelledby={`ex-${data.id}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="section-eyebrow">
            Lift {data.ord + 1} · {targetReadout}
          </p>
          <h2 id={`ex-${data.id}`} className="font-display text-2xl leading-[1.05]">
            {data.library?.name ?? humanize(data.slug)}
          </h2>
          {data.notes && (
            <p className="prose-readable text-xs italic text-muted-foreground">{data.notes}</p>
          )}
        </div>
        {data.library && (
          <ExerciseDetailDrawer
            library={data.library}
            sessionId={sessionId}
            sessionExerciseId={data.id}
          />
        )}
      </header>

      {data.library?.gif_url && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.library.gif_url}
            alt={data.library.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {topCues.length > 0 && (
        <ul className="space-y-1 text-sm">
          {topCues.map((cue, i) => (
            <li key={i} className="text-muted-foreground">
              <span className="text-primary">·</span> {cue}
            </li>
          ))}
        </ul>
      )}

      {/* Logging form */}
      {!isComplete && (
        <form onSubmit={onLog} className="space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`w-${data.id}`}>Weight (kg)</Label>
              <Input
                id={`w-${data.id}`}
                type="number"
                step="0.5"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="numeric text-lg"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`r-${data.id}`}>Reps</Label>
              <Input
                id={`r-${data.id}`}
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="numeric text-lg"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rpe-${data.id}`}>RPE (opt)</Label>
              <Input
                id={`rpe-${data.id}`}
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                className="numeric text-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="lg" className="flex-1" disabled={pending}>
              {pending ? 'Saving…' : `Log set ${nextSetNumber} / ${data.targetSets}`}
            </Button>
            {data.setLogs.length > 0 && (
              <Button type="button" variant="outline" size="lg" onClick={onUndo} disabled={pending}>
                <Undo2 className="h-4 w-4" />
                <span className="sr-only">Undo last set</span>
              </Button>
            )}
          </div>
        </form>
      )}

      {showTimer && !isComplete && (
        <RestTimer
          durationSeconds={data.restSeconds}
          autoStart
          onDone={() => setShowTimer(false)}
        />
      )}

      {data.setLogs.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-3 text-sm" aria-label="Logged sets">
          {data.setLogs.map((l) => (
            <li
              key={l.id}
              className="numeric flex animate-slide-in-right justify-between text-muted-foreground"
            >
              <span>Set {l.set_number}</span>
              <span className="tabular-nums">
                {l.weight_kg != null ? `${l.weight_kg} kg` : '—'} × {l.reps}
                {l.rpe != null && <span className="ml-2 text-xs">RPE {l.rpe}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isComplete && (
        <p className="pt-2 text-xs uppercase tracking-widest text-accent">
          ✓ {data.targetSets} sets complete
        </p>
      )}
    </article>
  )
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
