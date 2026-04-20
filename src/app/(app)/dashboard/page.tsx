import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatLagos, lagosAppDayWindowUtc, todayAppDayKey, todayLagosKey } from '@/lib/dates/lagos'
import { PhaseProgressBar } from './phase-progress-bar'

export const dynamic = 'force-dynamic'

const WATER_TARGET_ML = 3500

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayLagosKey()
  const todayApp = todayAppDayKey()
  const todayLabel = formatLagos(new Date(), 'EEEE, d MMMM')

  // Today's session context
  const { data: sessionRow } = user
    ? await supabase
        .from('sessions')
        .select('id, day_number, name, type, week_id')
        .eq('profile_id', user.id)
        .eq('session_date', today)
        .maybeSingle()
    : { data: null }

  const { data: weekRow } = sessionRow?.week_id
    ? await supabase
        .from('weeks')
        .select('number, is_deload, target_kcal, protein_g, carbs_g, fat_g, phase_id')
        .eq('id', sessionRow.week_id)
        .maybeSingle()
    : { data: null }
  const { data: phaseRow } = weekRow?.phase_id
    ? await supabase.from('phases').select('name').eq('id', weekRow.phase_id).maybeSingle()
    : { data: null }

  const { data: sessionLog } = sessionRow
    ? await supabase
        .from('session_logs')
        .select('started_at, ended_at')
        .eq('session_id', sessionRow.id)
        .maybeSingle()
    : { data: null }

  // Macros today
  const { startUtc, endUtc } = lagosAppDayWindowUtc(todayApp)
  const { data: entries } = user
    ? await supabase
        .from('nutrition_entries_with_macros')
        .select('kcal, protein_g, carbs_g, fat_g')
        .eq('profile_id', user.id)
        .gte('logged_at', startUtc.toISOString())
        .lt('logged_at', endUtc.toISOString())
    : { data: [] }
  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      kcal: acc.kcal + Number(e.kcal ?? 0),
      proteinG: acc.proteinG + Number(e.protein_g ?? 0),
      carbsG: acc.carbsG + Number(e.carbs_g ?? 0),
      fatG: acc.fatG + Number(e.fat_g ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )

  // Water today
  const { data: waterRows } = user
    ? await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('profile_id', user.id)
        .gte('logged_at', startUtc.toISOString())
        .lt('logged_at', endUtc.toISOString())
    : { data: [] }
  const waterMl = (waterRows ?? []).reduce((a, r) => a + Number(r.amount_ml), 0)

  // Check-in today
  const { data: checkin } = user
    ? await supabase
        .from('daily_checkins')
        .select('id, sleep_hours, energy, soreness')
        .eq('profile_id', user.id)
        .eq('check_date', today)
        .maybeSingle()
    : { data: null }

  const phaseEyebrow = sessionRow
    ? `${phaseLabel(phaseRow?.name)} · Week ${weekRow?.number ?? '—'}${weekRow?.is_deload ? ' · Deload' : ''} · Day ${sessionRow.day_number}`
    : '—'

  return (
    <section className="space-y-8 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">{phaseEyebrow}</p>
        <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">{todayLabel}.</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="numeric">{user?.email}</span>.
        </p>
      </header>

      {sessionRow && (
        <section className="border border-border bg-card p-5">
          <PhaseProgressBar dayNumber={sessionRow.day_number} />
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Session */}
        <article className="space-y-3 border border-border bg-card p-5 text-card-foreground">
          <p className="section-eyebrow">Today&apos;s session</p>
          {sessionRow ? (
            <>
              <h2 className="font-display text-2xl leading-[1.05]">{sessionRow.name}</h2>
              <p className="text-sm text-muted-foreground">
                {sessionLog?.ended_at
                  ? 'Complete.'
                  : sessionLog?.started_at
                    ? 'In progress — keep going.'
                    : 'Not started.'}
              </p>
              <Link
                href={`/session/${today}`}
                className="inline-block text-xs uppercase tracking-widest text-primary hover:underline"
              >
                Open session →
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No session scheduled for today.</p>
          )}
        </article>

        {/* Macros */}
        <article className="space-y-3 border border-border bg-card p-5 text-card-foreground">
          <p className="section-eyebrow">Macros today</p>
          {weekRow ? (
            <>
              <p className="numeric tabular-nums">
                <span className="text-2xl">{Math.round(totals.kcal)}</span>
                <span className="text-xs text-muted-foreground"> / {weekRow.target_kcal} kcal</span>
              </p>
              <p className="numeric text-xs tabular-nums text-muted-foreground">
                P {Math.round(totals.proteinG)}/{weekRow.protein_g} · C {Math.round(totals.carbsG)}/
                {weekRow.carbs_g} · F {Math.round(totals.fatG)}/{weekRow.fat_g}
              </p>
              <Link
                href={`/nutrition/${todayApp}`}
                className="inline-block text-xs uppercase tracking-widest text-primary hover:underline"
              >
                Log food →
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Targets not set yet.</p>
          )}
        </article>

        {/* Check-in + water */}
        <article className="space-y-4 border border-border bg-card p-5 text-card-foreground">
          <div>
            <p className="section-eyebrow">Morning check-in</p>
            {checkin ? (
              <p className="text-sm text-muted-foreground">
                Done · sleep{' '}
                <span className="numeric">
                  {checkin.sleep_hours != null ? `${checkin.sleep_hours}h` : '—'}
                </span>{' '}
                · energy {checkin.energy ?? '—'} · sore {checkin.soreness ?? '—'}
              </p>
            ) : (
              <Link
                href="/checkin"
                className="mt-1 inline-block text-xs uppercase tracking-widest text-primary hover:underline"
              >
                Check in →
              </Link>
            )}
          </div>
          <div>
            <p className="section-eyebrow">Water</p>
            <p className="numeric tabular-nums">
              {(waterMl / 1000).toFixed(2)} L{' '}
              <span className="text-xs text-muted-foreground">
                / {(WATER_TARGET_ML / 1000).toFixed(1)} L
              </span>
            </p>
          </div>
        </article>
      </div>

      <footer className="section-eyebrow pt-6">
        <span className="numeric">{today}</span> · Africa/Lagos
      </footer>
    </section>
  )
}

function phaseLabel(name: string | null | undefined): string {
  switch (name) {
    case 'foundation':
      return 'Foundation'
    case 'build':
      return 'Build'
    case 'reveal':
      return 'Reveal'
    case 'peak':
      return 'Peak'
    default:
      return '—'
  }
}
