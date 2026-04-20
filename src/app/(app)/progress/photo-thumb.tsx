'use client'

import { useEffect, useState } from 'react'
import { signedDownloadUrl } from './actions'

export function PhotoThumb({ storagePath, alt }: { storagePath: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!storagePath) {
      setUrl(null)
      return
    }
    let cancelled = false
    void signedDownloadUrl(storagePath).then((res) => {
      if (cancelled) return
      if (res.ok) setUrl(res.data.url)
    })
    return () => {
      cancelled = true
    }
  }, [storagePath])

  if (!storagePath) {
    return (
      <div
        className="flex aspect-[3/4] w-full items-center justify-center border border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
        aria-label={`No ${alt} yet`}
      >
        —
      </div>
    )
  }

  if (!url) {
    return (
      <div
        className="aspect-[3/4] w-full animate-pulse border border-border bg-muted/50"
        aria-hidden
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="aspect-[3/4] w-full border border-border object-cover"
    />
  )
}
