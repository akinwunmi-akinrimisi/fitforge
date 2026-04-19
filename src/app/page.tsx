import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-between px-4 py-12">
      <header>
        <p className="section-eyebrow">FitForge90</p>
      </header>

      <section className="space-y-8">
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Ninety days.
          <br />
          One plan that adapts.
        </h1>
        <p className="prose-readable text-muted-foreground">
          A coaching system, not a consumer app. Logs what you did, measures what happened, adjusts
          next week to match — inside safety rails that can&apos;t be overridden.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <footer className="section-eyebrow">
        Phase 1 · Foundation / Phase 2 · Build / Phase 3 · Reveal
      </footer>
    </main>
  )
}
