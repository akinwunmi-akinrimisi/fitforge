'use client'

import { useEffect, useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RestTimer({
  durationSeconds,
  autoStart = true,
  onDone,
}: {
  durationSeconds: number
  autoStart?: boolean
  onDone?: () => void
}) {
  const [remaining, setRemaining] = useState<number>(autoStart ? durationSeconds : 0)
  const [running, setRunning] = useState<boolean>(autoStart)
  const doneCalled = useRef(false)

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [running])

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false)
      if (!doneCalled.current) {
        doneCalled.current = true
        onDone?.()
      }
    }
  }, [remaining, running, onDone])

  const pct =
    durationSeconds > 0 ? Math.round(((durationSeconds - remaining) / durationSeconds) * 100) : 0

  return (
    <div className="flex items-center gap-3 border-t border-border pt-3">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="section-eyebrow">Rest</p>
          <p
            className={cn(
              'numeric text-sm tabular-nums',
              remaining <= 10 && running && 'text-primary',
            )}
          >
            {formatMmSs(remaining)}
          </p>
        </div>
        <Progress value={pct} className="mt-2" />
      </div>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={() => {
          doneCalled.current = true
          setRemaining(0)
          setRunning(false)
        }}
      >
        Skip
      </Button>
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={() => {
          doneCalled.current = false
          setRemaining(durationSeconds)
          setRunning(true)
        }}
      >
        Reset
      </Button>
    </div>
  )
}

function formatMmSs(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
