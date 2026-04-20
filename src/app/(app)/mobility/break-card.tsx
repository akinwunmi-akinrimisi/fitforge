'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { logMobilityBreak } from './actions'

type Props = {
  data: {
    id: string
    slug: string
    name: string
    focus: string
    durationSeconds: number
    exerciseSlugs: string[]
    postureCue: string
  }
  doneToday: boolean
}

export function BreakCard({ data, doneToday }: Props) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pending, startTransition] = useTransition()

  const perStep = Math.floor(data.durationSeconds / data.exerciseSlugs.length)
  const pctTotal = Math.min(100, Math.round((elapsed / data.durationSeconds) * 100))

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  useEffect(() => {
    const idx = Math.min(data.exerciseSlugs.length - 1, Math.floor(elapsed / Math.max(1, perStep)))
    setStepIndex(idx)
    if (elapsed >= data.durationSeconds && running) {
      setRunning(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      onFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, running])

  function onStart() {
    setElapsed(0)
    setStepIndex(0)
    setRunning(true)
  }

  function onStop() {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function onFinish() {
    startTransition(async () => {
      const res = await logMobilityBreak(data.id, Math.min(elapsed, data.durationSeconds))
      if (res.ok) {
        toast.success(`${data.name} · done`)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  const currentSlug = data.exerciseSlugs[stepIndex] ?? data.exerciseSlugs[0]!

  return (
    <article
      className={cn(
        'space-y-4 border border-border bg-card p-5 text-card-foreground',
        doneToday && !running && 'border-accent/50',
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="section-eyebrow">Focus · {data.focus}</p>
          <h2 className="font-display text-2xl leading-[1.05]">{data.name}</h2>
        </div>
        {doneToday && !running && (
          <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-accent">
            <Check className="h-3.5 w-3.5" />
            Done today
          </span>
        )}
      </header>

      <p className="prose-readable text-sm text-muted-foreground">{data.postureCue}</p>

      {running ? (
        <>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Step {stepIndex + 1} of {data.exerciseSlugs.length}
              </p>
              <p className="numeric text-sm tabular-nums">
                {formatSecs(data.durationSeconds - elapsed)}
              </p>
            </div>
            <h3 className="mt-1 font-display text-xl">{humanize(currentSlug)}</h3>
            <Progress value={pctTotal} className="mt-2" />
          </div>
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onStop}>
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
            {data.exerciseSlugs.map((s) => (
              <li key={s}>· {humanize(s)}</li>
            ))}
          </ul>
          <Button type="button" size="lg" className="w-full" onClick={onStart} disabled={pending}>
            <Play className="h-4 w-4" />
            {doneToday ? 'Run again' : `Start · ${data.durationSeconds}s`}
          </Button>
        </>
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

function formatSecs(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
