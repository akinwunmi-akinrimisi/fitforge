'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logCardio } from '../actions'
import type { CardioBlockJson, CardioLogRow } from './types'

const MODALITY_LABEL: Record<string, string> = {
  treadmill: 'Treadmill',
  bike: 'Bike',
  rower: 'Rower',
  sled: 'Sled',
  assault_bike: 'Assault bike',
  outdoor_walk: 'Outdoor walk',
  outdoor_run: 'Outdoor run',
}

export function CardioCard({
  sessionId,
  block,
  existing,
  onChanged,
}: {
  sessionId: string
  block: NonNullable<CardioBlockJson>
  existing: CardioLogRow | null
  onChanged?: () => void
}) {
  const [durationMmss, setDurationMmss] = useState<string>(
    block.targetDurationMinutes ? `${block.targetDurationMinutes}:00` : '',
  )
  const [distance, setDistance] = useState<string>('')
  const [hr, setHr] = useState<string>('')
  const [rpe, setRpe] = useState<string>(block.targetRpe ? String(block.targetRpe) : '')
  const [pending, startTransition] = useTransition()

  if (existing) {
    const durMin = Math.round(existing.duration_seconds / 60)
    return (
      <article className="space-y-2 border border-accent/50 bg-card p-5 text-card-foreground">
        <p className="section-eyebrow">Cardio — logged</p>
        <h2 className="font-display text-xl leading-[1.05]">
          {MODALITY_LABEL[existing.modality] ?? existing.modality}
        </h2>
        <p className="numeric text-sm text-muted-foreground">
          {durMin} min · RPE {existing.rpe}
          {existing.distance_m ? ` · ${existing.distance_m} m` : ''}
          {existing.avg_hr ? ` · HR ${existing.avg_hr} bpm` : ''}
        </p>
      </article>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const dur = parseMmss(durationMmss)
    if (dur === null || dur <= 0) {
      toast.error('Duration must be m:ss or mm:ss')
      return
    }
    const r = Number(rpe)
    if (!Number.isFinite(r) || r < 1 || r > 10) {
      toast.error('RPE is required (1-10)')
      return
    }
    const dist = distance.trim() ? Number(distance) : undefined
    const hrN = hr.trim() ? Number(hr) : undefined
    if (hrN !== undefined && (!Number.isFinite(hrN) || hrN < 40 || hrN > 230)) {
      toast.error('Avg HR must be 40-230')
      return
    }

    startTransition(async () => {
      const payload: {
        sessionId: string
        modality: typeof block.modality
        durationSeconds: number
        distanceM?: number
        avgHr?: number
        rpe: number
      } = {
        sessionId,
        modality: block.modality,
        durationSeconds: dur,
        rpe: r,
      }
      if (dist !== undefined && Number.isFinite(dist) && dist >= 0) payload.distanceM = dist
      if (hrN !== undefined) payload.avgHr = hrN

      const res = await logCardio(payload)
      if (res.ok) {
        toast.success('Cardio logged')
        onChanged?.()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <article className="space-y-4 border border-border bg-card p-5 text-card-foreground">
      <header className="space-y-1.5">
        <p className="section-eyebrow">
          Cardio · {MODALITY_LABEL[block.modality] ?? block.modality}
        </p>
        <h2 className="font-display text-2xl leading-[1.05]">
          {block.kind === 'intervals'
            ? 'Intervals'
            : block.kind === 'complex'
              ? 'Complex'
              : 'Steady-state'}
        </h2>
        <p className="prose-readable text-sm text-muted-foreground">{block.prescription}</p>
      </header>

      <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="c-duration">Duration (mm:ss)</Label>
            <Input
              id="c-duration"
              inputMode="numeric"
              placeholder="24:00"
              value={durationMmss}
              onChange={(e) => setDurationMmss(e.target.value)}
              className="numeric text-lg"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-rpe">RPE · required</Label>
            <Input
              id="c-rpe"
              type="number"
              min={1}
              max={10}
              inputMode="numeric"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="numeric text-lg"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="c-distance">Distance (m · opt)</Label>
            <Input
              id="c-distance"
              type="number"
              inputMode="decimal"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="numeric text-lg"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-hr">Avg HR (opt)</Label>
            <Input
              id="c-hr"
              type="number"
              inputMode="numeric"
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              className="numeric text-lg"
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Saving…' : 'Log cardio'}
        </Button>
      </form>
    </article>
  )
}

function parseMmss(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 60
  const m = /^(\d+):(\d{1,2})$/.exec(trimmed)
  if (!m) return null
  const mins = Number(m[1])
  const secs = Number(m[2])
  if (secs >= 60) return null
  return mins * 60 + secs
}
