'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertBodyMetric } from './actions'

export function WeighInForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter()
  const [date, setDate] = useState(defaultDate)
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const w = weight.trim() === '' ? undefined : Number(weight)
    const waistN = waist.trim() === '' ? undefined : Number(waist)
    if (w !== undefined && (!Number.isFinite(w) || w < 20 || w > 400)) {
      toast.error('Weight must be 20-400 kg')
      return
    }
    if (waistN !== undefined && (!Number.isFinite(waistN) || waistN < 30 || waistN > 200)) {
      toast.error('Waist must be 30-200 cm')
      return
    }
    if (w === undefined && waistN === undefined) {
      toast.error('Enter weight or waist (or both)')
      return
    }

    startTransition(async () => {
      const payload: {
        measuredOn: string
        weightKg?: number
        waistCm?: number
      } = { measuredOn: date }
      if (w !== undefined) payload.weightKg = w
      if (waistN !== undefined) payload.waistCm = waistN
      const res = await upsertBodyMetric(payload)
      if (res.ok) {
        toast.success('Logged.')
        setWeight('')
        setWaist('')
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_auto_auto]">
      <div className="space-y-1">
        <Label htmlFor="bm-date">Date</Label>
        <Input
          id="bm-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="numeric"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bm-weight">Weight (kg)</Label>
        <Input
          id="bm-weight"
          type="number"
          step="0.1"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="101.2"
          className="numeric"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bm-waist">Waist (cm · opt)</Label>
        <Input
          id="bm-waist"
          type="number"
          step="0.1"
          inputMode="decimal"
          value={waist}
          onChange={(e) => setWaist(e.target.value)}
          placeholder="96"
          className="numeric"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Saving…' : 'Log'}
        </Button>
      </div>
    </form>
  )
}
