import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatLagos, todayLagosKey } from '@/lib/dates/lagos'
import { Toaster } from '@/components/ui/toaster'
import { WeighInForm } from './weigh-in-form'
import { WeightChart, StrengthChart } from './charts-lazy'
import { type WeightPoint } from './weight-chart'
import { type StrengthPoint } from './strength-chart'
import { PhotoUploader } from './photo-uploader'
import { PhotoThumb } from './photo-thumb'
import type { PhotoKind, PhotoView } from '@/domain/progress'

export const dynamic = 'force-dynamic'

const COMPARISON_WEEKS = [1, 4, 8, 12, 13] as const
const BODY_VIEWS: Array<{ kind: PhotoKind; view: PhotoView; label: string }> = [
  { kind: 'body', view: 'front', label: 'Body · front' },
  { kind: 'body', view: 'side', label: 'Body · side' },
  { kind: 'body', view: 'back', label: 'Body · back' },
  { kind: 'face', view: 'front', label: 'Face · front' },
  { kind: 'face', view: 'profile', label: 'Face · profile' },
]

export default async function ProgressPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayLagosKey()

  // Body metrics (weight + trend)
  const { data: bodyRows } = user
    ? await supabase
        .from('body_weight_trend')
        .select('measured_on, weight_kg, trend_7_kg')
        .eq('profile_id', user.id)
        .order('measured_on')
    : { data: [] }
  const weightSeries: WeightPoint[] = (bodyRows ?? []).map((r) => ({
    measuredOn: r.measured_on,
    weightKg: r.weight_kg !== null ? Number(r.weight_kg) : null,
    trend7Kg: r.trend_7_kg !== null ? Number(r.trend_7_kg) : null,
  }))

  const latest = weightSeries.at(-1) ?? null
  const first = weightSeries[0] ?? null
  const deltaKg =
    latest?.weightKg != null && first?.weightKg != null
      ? Number((latest.weightKg - first.weightKg).toFixed(1))
      : null

  // Strength: top 3 compound lifts' top-set load per week.
  const strengthSlugs = ['barbell-back-squat', 'barbell-bench-press', 'romanian-deadlift']
  const { data: strengthRows } = user
    ? await supabase
        .from('set_logs')
        .select(
          'weight_kg, session_exercise_id, session_exercises!inner(exercise_slug, session_id, sessions!inner(week_id, weeks!inner(number)))',
        )
        .eq('profile_id', user.id)
        .in('session_exercises.exercise_slug', strengthSlugs)
        .order('weight_kg', { ascending: false })
    : { data: [] }
  type StrengthJoinRow = {
    weight_kg: number | null
    session_exercises?: {
      exercise_slug?: string
      sessions?: { weeks?: { number?: number } }
    }
  }
  const byWeek = new Map<number, Record<string, number | null>>()
  for (const r of (strengthRows ?? []) as unknown as StrengthJoinRow[]) {
    const slug = r.session_exercises?.exercise_slug
    const week = r.session_exercises?.sessions?.weeks?.number
    const wkg = r.weight_kg != null ? Number(r.weight_kg) : null
    if (!slug || !week || wkg == null) continue
    const existing = byWeek.get(week) ?? {}
    if (existing[slug] == null || wkg > (existing[slug] as number)) existing[slug] = wkg
    byWeek.set(week, existing)
  }
  const strengthSeries: StrengthPoint[] = Array.from(byWeek.keys())
    .sort((a, b) => a - b)
    .map((wk) => ({ weekNumber: wk, ...byWeek.get(wk)! }))

  // Photos: for comparison weeks, find the photo closest to the week's middle Sunday.
  const { data: planRow } = user
    ? await supabase
        .from('plans')
        .select('start_date')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle()
    : { data: null }
  const planStart = planRow?.start_date as string | undefined

  const { data: photoRows } = user
    ? await supabase
        .from('progress_photos')
        .select('taken_on, kind, view, storage_path')
        .eq('profile_id', user.id)
        .order('taken_on')
    : { data: [] }

  // For "this week's upload slots", use today's date. For the weekly gallery,
  // pick a representative photo per comparison week (any body/front photo
  // taken within that week's calendar range).
  const thisWeekPhotos = new Map<string, string>()
  for (const p of photoRows ?? []) {
    if (p.taken_on === today) thisWeekPhotos.set(`${p.kind}-${p.view}`, p.storage_path)
  }

  const gallery: Array<{ week: number; body?: string | undefined; face?: string | undefined }> = []
  if (planStart) {
    for (const wk of COMPARISON_WEEKS) {
      const weekStart = new Date(`${planStart}T00:00:00Z`)
      weekStart.setUTCDate(weekStart.getUTCDate() + (wk - 1) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
      const startKey = weekStart.toISOString().slice(0, 10)
      const endKey = weekEnd.toISOString().slice(0, 10)
      const within = (photoRows ?? []).filter((p) => p.taken_on >= startKey && p.taken_on <= endKey)
      const body = within.find((p) => p.kind === 'body' && p.view === 'front')?.storage_path
      const face = within.find((p) => p.kind === 'face' && p.view === 'front')?.storage_path
      gallery.push({ week: wk, body: body ?? undefined, face: face ?? undefined })
    }
  }

  // Latest adaptation reasoning (read-only display).
  const { data: lastAdaptation } = user
    ? await supabase
        .from('adaptations')
        .select('week_number_closed, decision, reasoning, created_at')
        .eq('profile_id', user.id)
        .order('week_number_closed', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  return (
    <div className="space-y-10 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Progress</p>
        <h1 className="font-display text-4xl leading-[1.05]">
          {latest?.weightKg != null ? `${latest.weightKg} kg today.` : 'Log your first weigh-in.'}
        </h1>
        {deltaKg !== null && first?.measuredOn && (
          <p className="numeric text-sm text-muted-foreground">
            {deltaKg > 0 ? '+' : ''}
            {deltaKg} kg since {formatLagos(`${first.measuredOn}T12:00:00Z`, 'd MMM')}
          </p>
        )}
      </header>

      <section className="space-y-4 border border-border bg-card p-5">
        <p className="section-eyebrow">Weigh-in</p>
        <WeighInForm defaultDate={today} />
        <WeightChart data={weightSeries} />
      </section>

      <section className="space-y-4 border border-border bg-card p-5">
        <p className="section-eyebrow">Strength · top sets per week</p>
        <StrengthChart data={strengthSeries} slugs={strengthSlugs} />
      </section>

      <section className="space-y-4 border border-border bg-card p-5">
        <p className="section-eyebrow">This week&apos;s photos · {today}</p>
        <p className="prose-readable text-xs text-muted-foreground">
          Files go to a private Storage bucket. The server issues short-lived signed URLs; paths are
          never logged.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {BODY_VIEWS.map((v) => {
            const key = `${v.kind}-${v.view}`
            const hasPhoto = thisWeekPhotos.has(key)
            return (
              <div key={key} className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {v.label}
                </p>
                <PhotoThumb storagePath={thisWeekPhotos.get(key) ?? null} alt={v.label} />
                <PhotoUploader takenOn={today} kind={v.kind} view={v.view} hasPhoto={hasPhoto} />
              </div>
            )
          })}
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="space-y-4 border border-border bg-card p-5">
          <p className="section-eyebrow">Comparison · week 1 / 4 / 8 / 12 / 13</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {gallery.map((g) => (
              <div key={g.week} className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Week {g.week}
                </p>
                <PhotoThumb storagePath={g.body ?? null} alt={`Week ${g.week} body`} />
                <PhotoThumb storagePath={g.face ?? null} alt={`Week ${g.week} face`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {lastAdaptation && (
        <section className="space-y-2 border border-border bg-card p-5">
          <p className="section-eyebrow">
            Last adaptation · week {lastAdaptation.week_number_closed} ·{' '}
            <span className="text-primary">{lastAdaptation.decision}</span>
          </p>
          <p className="prose-readable text-sm text-muted-foreground">{lastAdaptation.reasoning}</p>
        </section>
      )}

      <Toaster />
    </div>
  )
}
