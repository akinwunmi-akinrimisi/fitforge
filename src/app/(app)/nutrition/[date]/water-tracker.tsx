'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { addWater, removeWater } from '../actions'
import type { WaterLogRow } from './types'

const DEFAULT_GLASS_ML = 250

export function WaterTracker({ entries, targetMl }: { entries: WaterLogRow[]; targetMl: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [glassMl, setGlassMl] = useState<number>(DEFAULT_GLASS_ML)

  const totalMl = entries.reduce((acc, e) => acc + e.amount_ml, 0)
  const pct = Math.min(100, Math.round((totalMl / targetMl) * 100))

  function add() {
    startTransition(async () => {
      const res = await addWater({ amountMl: glassMl })
      if (res.ok) router.refresh()
      else toast.error(res.message)
    })
  }

  function undo() {
    const latest = entries.at(-1)
    if (!latest) return
    startTransition(async () => {
      const res = await removeWater(latest.id)
      if (res.ok) router.refresh()
      else toast.error(res.message)
    })
  }

  return (
    <section className="space-y-3 border border-border bg-card p-5">
      <header className="flex items-baseline justify-between gap-3">
        <p className="section-eyebrow">Water · target 3.5 L</p>
        <p className="numeric text-sm tabular-nums">
          {(totalMl / 1000).toFixed(2)} L{' '}
          <span className="text-muted-foreground">/ {(targetMl / 1000).toFixed(1)} L</span>
        </p>
      </header>
      <Progress value={pct} />
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <select
          value={glassMl}
          onChange={(e) => setGlassMl(Number(e.target.value))}
          className="h-10 rounded-sm border border-border bg-transparent px-2 text-sm"
          aria-label="Glass size"
        >
          <option value={250}>Small glass · 250 ml</option>
          <option value={350}>Tall glass · 350 ml</option>
          <option value={500}>Bottle · 500 ml</option>
          <option value={750}>Large bottle · 750 ml</option>
        </select>
        <Button type="button" onClick={add} disabled={pending} size="lg">
          <Plus className="h-4 w-4" />
          Add
        </Button>
        {entries.length > 0 && (
          <Button type="button" variant="outline" size="lg" onClick={undo} disabled={pending}>
            <Minus className="h-4 w-4" />
            Undo
          </Button>
        )}
      </div>
      {entries.length > 0 && (
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} today
        </p>
      )}
    </section>
  )
}
