'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-6 px-4">
      <p className="section-eyebrow">Error</p>
      <h1 className="font-display text-3xl leading-tight">Something broke on our side.</h1>
      <p className="text-muted-foreground">
        Try again. If the problem sticks, note the reference below and we&apos;ll look into it.
      </p>
      {error.digest && (
        <p className="numeric text-xs text-muted-foreground">ref: {error.digest}</p>
      )}
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
