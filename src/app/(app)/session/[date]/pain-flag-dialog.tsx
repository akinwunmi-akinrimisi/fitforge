'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logPain } from '../actions'

export function PainFlagDialog({
  sessionId,
  sessionExerciseId,
  children,
}: {
  sessionId: string
  sessionExerciseId?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState(5)
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!location.trim()) {
      toast.error('Describe the location (e.g. "lower back", "right knee")')
      return
    }
    startTransition(async () => {
      const input: {
        sessionId: string
        sessionExerciseId?: string
        location: string
        severity: number
        note?: string
      } = { sessionId, location: location.trim(), severity }
      if (sessionExerciseId) input.sessionExerciseId = sessionExerciseId
      if (note.trim()) input.note = note.trim()

      const res = await logPain(input)
      if (res.ok) {
        toast.success(
          severity >= 6
            ? "Logged. Next session's volume will be capped at 70% for this movement."
            : 'Pain note logged.',
        )
        setOpen(false)
        setLocation('')
        setSeverity(5)
        setNote('')
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag pain</DialogTitle>
          <DialogDescription>
            Severity ≥ 6 triggers a 70% volume cap on the next session for this movement pattern. No
            judgement — honest data beats stoicism.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pain-location">Location</Label>
            <Input
              id="pain-location"
              placeholder="e.g. lower back, right knee"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pain-severity">Severity · {severity}/10</Label>
            <input
              id="pain-severity"
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>1 · niggle</span>
              <span>5</span>
              <span>10 · stop</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pain-note">Note (optional)</Label>
            <Input
              id="pain-note"
              placeholder="What were you doing when it came on?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Log pain'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
