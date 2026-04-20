'use client'

/**
 * Photo uploader — takes any JPEG/PNG/HEIC from the device camera or file
 * picker, re-encodes it to WebP via canvas (which strips EXIF as a side
 * effect of the re-encode), then PUTs it to the signed URL issued by
 * signedUploadUrl(). Never posts the raw file through our server.
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { commitPhoto, signedUploadUrl } from './actions'
import type { PhotoKind, PhotoView } from '@/domain/progress'

const MAX_WIDTH = 1200
const WEBP_QUALITY = 0.82

export function PhotoUploader({
  takenOn,
  kind,
  view,
  hasPhoto,
}: {
  takenOn: string
  kind: PhotoKind
  view: PhotoView
  hasPhoto: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)

  function onPick() {
    inputRef.current?.click()
  }

  async function onFile(file: File) {
    setProgress('Converting to WebP…')
    const encoded = await reencodeToWebP(file)
    if (!encoded) {
      setProgress(null)
      toast.error('Could not read photo')
      return
    }

    setProgress('Getting upload URL…')
    const signed = await signedUploadUrl({ takenOn, kind, view })
    if (!signed.ok) {
      setProgress(null)
      toast.error(signed.message)
      return
    }

    setProgress('Uploading…')
    const put = await fetch(signed.data.url, {
      method: 'PUT',
      headers: { 'content-type': 'image/webp', 'x-upsert': 'true' },
      body: encoded.blob,
    })
    if (!put.ok) {
      setProgress(null)
      toast.error(`Upload failed (${put.status})`)
      return
    }

    setProgress('Recording…')
    const commit = await commitPhoto({
      takenOn,
      kind,
      view,
      storagePath: signed.data.path,
      widthPx: encoded.width,
      heightPx: encoded.height,
      bytes: encoded.blob.size,
    })
    if (!commit.ok) {
      setProgress(null)
      toast.error(commit.message)
      return
    }

    setProgress(null)
    toast.success(`${kind}/${view} photo saved`)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ''
        }}
      />
      <Button
        type="button"
        variant={hasPhoto ? 'outline' : 'default'}
        size="sm"
        onClick={onPick}
        disabled={pending || !!progress}
        className={cn('w-full', hasPhoto && 'text-accent')}
      >
        {hasPhoto ? <Check className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
        <span className="text-xs uppercase tracking-widest">
          {progress ?? (hasPhoto ? 'Replace' : 'Add photo')}
        </span>
      </Button>
    </div>
  )
}

async function reencodeToWebP(
  file: File,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const srcW = bitmap.width
    const srcH = bitmap.height
    const scale = srcW > MAX_WIDTH ? MAX_WIDTH / srcW : 1
    const w = Math.round(srcW * scale)
    const h = Math.round(srcH * scale)

    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = (canvas as HTMLCanvasElement).getContext('2d', { alpha: false })
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) => {
      if ('convertToBlob' in canvas) {
        ;(canvas as OffscreenCanvas)
          .convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY })
          .then(resolve, () => resolve(null))
      } else {
        ;(canvas as HTMLCanvasElement).toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY)
      }
    })
    if (!blob) return null
    return { blob, width: w, height: h }
  } catch {
    return null
  }
}
