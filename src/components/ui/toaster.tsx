'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'border border-border bg-background text-foreground rounded-sm font-sans text-sm',
          title: 'font-medium',
          description: 'text-muted-foreground',
          error: 'border-primary text-primary',
          success: 'border-accent',
        },
      }}
    />
  )
}
