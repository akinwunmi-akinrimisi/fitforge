'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { startSession } from '../actions'
import { ExerciseCard } from './exercise-card'
import { CardioCard } from './cardio-card'
import { WarmupCard } from './warmup-card'
import { EndSession } from './end-session'
import type { SessionViewData } from './types'

export function SessionView({ data }: { data: SessionViewData }) {
  const router = useRouter()
  const [hasStarted, setHasStarted] = useState<boolean>(!!data.sessionLog)

  // Start the session log the first time the user views the session.
  useEffect(() => {
    if (hasStarted) return
    if (data.session.type === 'rest') return
    void startSession(data.session.id).then((res) => {
      if (res.ok) setHasStarted(true)
      // Soft-fail: we'll retry on first logSet
    })
  }, [data.session.id, data.session.type, hasStarted])

  const phaseEyebrow = `${phaseLabel(data.phase)} · Week ${data.weekNumber}${data.isDeload ? ' · Deload' : ''} · Day ${data.session.dayNumber}`

  if (data.session.type === 'rest') {
    return (
      <div data-surface="session" className="space-y-10 py-6">
        <header className="space-y-3">
          <p className="section-eyebrow">{phaseEyebrow}</p>
          <h1 className="font-display text-4xl leading-[1.05]">{data.dateLabel}.</h1>
          <p className="numeric text-xs text-muted-foreground">{data.date} · Rest day</p>
        </header>
        {data.session.mobility && (
          <section className="space-y-3 border border-border p-6">
            <p className="section-eyebrow">
              Optional mobility · {data.session.mobility.durationMinutes} min
            </p>
            <ul className="prose-readable space-y-1 text-sm text-muted-foreground">
              {data.session.mobility.exerciseSlugs.map((s) => (
                <li key={s}>· {humanize(s)}</li>
              ))}
            </ul>
          </section>
        )}
        <Toaster />
      </div>
    )
  }

  return (
    <div data-surface="session" className="space-y-8 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">{phaseEyebrow}</p>
        <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">{data.session.name}.</h1>
        <p className="numeric text-xs text-muted-foreground">
          {data.date} · {data.dateLabel}
        </p>
      </header>

      {data.session.redFlagVolumeCap && (
        <aside
          role="alert"
          className="flex items-start gap-3 border border-primary/50 bg-primary/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="section-eyebrow text-primary">
              Red-flag · volume capped at {Math.round(data.session.redFlagVolumeCap * 100)}%
            </p>
            <p className="text-muted-foreground">{data.session.redFlagReason}</p>
          </div>
        </aside>
      )}

      {data.session.warmup && <WarmupCard warmup={data.session.warmup} />}

      {data.exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          sessionId={data.session.id}
          data={ex}
          onChanged={() => router.refresh()}
        />
      ))}

      {data.session.cardio && (
        <CardioCard
          sessionId={data.session.id}
          block={data.session.cardio}
          existing={data.cardioLog}
          onChanged={() => router.refresh()}
        />
      )}

      <EndSession
        sessionId={data.session.id}
        dateKey={data.date}
        existing={data.sessionLog}
        onChanged={() => router.refresh()}
      />

      <Toaster />
    </div>
  )
}

function phaseLabel(name: string): string {
  switch (name) {
    case 'foundation':
      return 'Foundation'
    case 'build':
      return 'Build'
    case 'reveal':
      return 'Reveal'
    case 'peak':
      return 'Peak'
    default:
      return name
  }
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
