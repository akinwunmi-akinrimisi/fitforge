import { createSupabaseServerClient } from '@/lib/supabase/server'
import { todayLagosKey } from '@/lib/dates/lagos'
import { Toaster } from '@/components/ui/toaster'
import { BreakCard } from './break-card'

export const dynamic = 'force-dynamic'

export default async function MobilityPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const today = todayLagosKey()

  const { data: breaks } = await supabase
    .from('mobility_breaks')
    .select('id, slug, name, focus, duration_seconds, exercise_slugs, posture_cue')
    .order('name')

  const { data: todayLogs } = user
    ? await supabase
        .from('mobility_logs')
        .select('mobility_break_id')
        .eq('profile_id', user.id)
        .eq('completed_on', today)
    : { data: [] }

  const doneSet = new Set((todayLogs ?? []).map((l) => l.mobility_break_id))

  return (
    <div className="space-y-8 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Desk mobility · {today}</p>
        <h1 className="font-display text-4xl leading-[1.05]">Break the sitting.</h1>
        <p className="prose-readable text-sm text-muted-foreground">
          Four short flows. Do them at 10, 12, 2, and 4 Lagos — or when your back reminds you. Each
          takes 60–90 seconds.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {(breaks ?? []).map((b) => (
          <BreakCard
            key={b.id}
            data={{
              id: b.id,
              slug: b.slug,
              name: b.name,
              focus: b.focus,
              durationSeconds: b.duration_seconds,
              exerciseSlugs: b.exercise_slugs,
              postureCue: b.posture_cue,
            }}
            doneToday={doneSet.has(b.id)}
          />
        ))}
      </div>

      <Toaster />
    </div>
  )
}
