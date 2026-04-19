'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendMagicLink, signInWithPassword } from './actions'

type Status = { kind: 'idle' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string }

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (next) formData.set('next', next)

    startTransition(async () => {
      const result =
        mode === 'magic'
          ? await sendMagicLink(formData)
          : await signInWithPassword(formData)
      if (result?.ok) {
        setStatus({ kind: 'ok', message: result.message ?? 'Success.' })
      } else if (result) {
        setStatus({ kind: 'error', message: result.message })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@domain.com"
        />
      </div>

      {mode === 'password' && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending
            ? 'Working…'
            : mode === 'magic'
              ? 'Send magic link'
              : 'Sign in with password'}
        </Button>
        <button
          type="button"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={() => {
            setStatus({ kind: 'idle' })
            setMode(mode === 'magic' ? 'password' : 'magic')
          }}
        >
          {mode === 'magic' ? 'Use password instead' : 'Use magic link instead'}
        </button>
      </div>

      {status.kind === 'ok' && (
        <p className="text-sm text-accent" role="status">
          {status.message}
        </p>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-primary" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
