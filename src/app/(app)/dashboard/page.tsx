import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatLagos, todayLagosKey } from '@/lib/dates/lagos'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayLagosKey()
  const todayLabel = formatLagos(new Date(), 'EEEE, d MMMM')

  return (
    <section className="space-y-10 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Foundation · Week 1 · Day 1</p>
        <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">{todayLabel}.</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="numeric">{user?.email}</span>.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card
          title="Today's session"
          body="Plan generation runs in M2. Once seeded, this card surfaces your next workout with a two-tap logging flow."
        />
        <Card
          title="Macros"
          body="Nutrition UI ships in M4 — live ring for kcal / protein / carbs / fat plus Nigerian food DB."
        />
        <Card
          title="Adaptation"
          body="Weekly recalibration lands in M5. Every Sunday 23:59 Lagos, the plan adjusts within safety caps."
        />
      </div>

      <footer className="section-eyebrow pt-6">
        <span className="numeric">{today}</span> · Africa/Lagos
      </footer>
    </section>
  )
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <article className="space-y-2 border border-border bg-card p-6 text-card-foreground">
      <p className="section-eyebrow">{title}</p>
      <p className="prose-readable text-sm text-muted-foreground">{body}</p>
    </article>
  )
}
