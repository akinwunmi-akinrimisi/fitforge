import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-6 px-4">
      <p className="section-eyebrow">404</p>
      <h1 className="font-display text-3xl leading-tight">Nothing here.</h1>
      <p className="text-muted-foreground">
        The page you were looking for doesn&apos;t exist.
      </p>
      <div>
        <Button asChild variant="outline">
          <Link href="/">Back to start</Link>
        </Button>
      </div>
    </main>
  )
}
