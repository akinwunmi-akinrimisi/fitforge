import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { todayLagosKey } from '@/lib/dates/lagos'

export const dynamic = 'force-dynamic'

type Phase = { id: string; number: number; name: string }
type Week = { id: string; phase_id: string; number: number; is_deload: boolean }
type Session = {
  id: string
  week_id: string
  day_number: number
  day_of_week: number
  type: 'strength' | 'conditioning' | 'hybrid' | 'rest'
  name: string | null
  session_date: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PHASE_ORDER = ['foundation', 'build', 'reveal', 'peak']

export default async function PlanPage() {
  const supabase = createSupabaseServerClient()
  const today = todayLagosKey()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: plan } = await supabase
    .from('plans')
    .select('id, start_date, version, generated_at')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!plan) {
    return (
      <div className="space-y-4 py-6">
        <h1 className="font-display text-4xl leading-[1.05]">No plan yet.</h1>
        <p className="prose-readable text-muted-foreground">
          Run the seed (or your onboarding) to generate your 90-day plan.
        </p>
      </div>
    )
  }

  const [phasesRes, weeksRes, sessionsRes, logsRes, adaptationsRes] = await Promise.all([
    supabase.from('phases').select('id, number, name').eq('plan_id', plan.id).order('number'),
    supabase
      .from('weeks')
      .select('id, phase_id, number, is_deload')
      .eq('plan_id', plan.id)
      .order('number'),
    supabase
      .from('sessions')
      .select('id, week_id, day_number, day_of_week, type, name, session_date')
      .eq('plan_id', plan.id)
      .order('session_date'),
    supabase
      .from('session_logs')
      .select('session_id, ended_at')
      .eq('profile_id', user.id)
      .not('ended_at', 'is', null),
    supabase
      .from('adaptations')
      .select('week_number_closed, decision, reasoning, created_at')
      .eq('profile_id', user.id)
      .order('week_number_closed', { ascending: false }),
  ])

  const phases = (phasesRes.data ?? []) as Phase[]
  const weeks = (weeksRes.data ?? []) as Week[]
  const sessions = (sessionsRes.data ?? []) as Session[]
  const doneLogIds = new Set((logsRes.data ?? []).map((l) => l.session_id))
  const adaptationsByWeek = new Map(
    (adaptationsRes.data ?? []).map((a) => [a.week_number_closed as number, a]),
  )

  // Group
  const weeksByPhase = new Map<string, Week[]>()
  for (const w of weeks) {
    if (!weeksByPhase.has(w.phase_id)) weeksByPhase.set(w.phase_id, [])
    weeksByPhase.get(w.phase_id)!.push(w)
  }
  const sessionsByWeek = new Map<string, Session[]>()
  for (const s of sessions) {
    if (!sessionsByWeek.has(s.week_id)) sessionsByWeek.set(s.week_id, [])
    sessionsByWeek.get(s.week_id)!.push(s)
  }

  // Figure out current phase/week/session based on today.
  const currentSession = sessions.find((s) => s.session_date === today) ?? null
  const currentWeekId = currentSession?.week_id ?? null
  const currentPhaseId = currentWeekId
    ? weeks.find((w) => w.id === currentWeekId)?.phase_id
    : undefined

  const totalSessions = sessions.length
  const done = doneLogIds.size
  const donePct = totalSessions > 0 ? Math.round((done / totalSessions) * 100) : 0

  return (
    <div className="space-y-10 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Plan</p>
        <h1 className="font-display text-4xl leading-[1.05]">Ninety days, mapped.</h1>
        <p className="prose-readable text-sm text-muted-foreground">
          Started {formatIsoShort(plan.start_date)}. {done} of {totalSessions} sessions complete ·{' '}
          {donePct}%. Tap any day to open that session. Future weeks may still shift as the Sunday
          recalibration runs.
        </p>
      </header>

      {phases
        .slice()
        .sort((a, b) => PHASE_ORDER.indexOf(a.name) - PHASE_ORDER.indexOf(b.name))
        .map((phase) => {
          const phaseWeeks = weeksByPhase.get(phase.id) ?? []
          const phaseSessions = phaseWeeks.flatMap((w) => sessionsByWeek.get(w.id) ?? [])
          const phaseDone = phaseSessions.filter((s) => doneLogIds.has(s.id)).length
          const isCurrent = phase.id === currentPhaseId
          const isComplete =
            phaseSessions.length > 0 && phaseSessions.every((s) => doneLogIds.has(s.id))

          return (
            <details
              key={phase.id}
              open={isCurrent || (!currentPhaseId && phase.number === 1)}
              className="group border border-border bg-card"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <div>
                  <p className="section-eyebrow">Phase {phase.number}</p>
                  <h2 className="font-display text-2xl capitalize leading-[1.05]">{phase.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="numeric text-xs text-muted-foreground">
                    {phaseDone}/{phaseSessions.length}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary-foreground">
                      Now
                    </span>
                  )}
                  {isComplete && !isCurrent && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Done
                    </span>
                  )}
                  <span className="text-muted-foreground transition group-open:rotate-90">›</span>
                </div>
              </summary>

              <div className="space-y-5 px-5 pb-5">
                {phaseWeeks.map((week) => {
                  const weekSessions = sessionsByWeek.get(week.id) ?? []
                  const weekDone = weekSessions.filter((s) => doneLogIds.has(s.id)).length
                  const adaptation = adaptationsByWeek.get(week.number)
                  const isCurrentWeek = week.id === currentWeekId

                  return (
                    <section
                      key={week.id}
                      className={`space-y-3 rounded-sm border-l-2 pl-4 ${
                        isCurrentWeek ? 'border-l-primary' : 'border-l-border'
                      }`}
                    >
                      <header className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-display text-lg leading-tight">Week {week.number}</h3>
                          {week.is_deload && (
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              · Deload
                            </span>
                          )}
                          {isCurrentWeek && (
                            <span className="text-[10px] uppercase tracking-widest text-primary">
                              · Current
                            </span>
                          )}
                        </div>
                        <span className="numeric text-xs text-muted-foreground">
                          {weekDone}/{weekSessions.length}
                        </span>
                      </header>

                      <ol className="grid grid-cols-7 gap-1.5">
                        {DAYS.map((day, i) => {
                          const s = weekSessions.find((x) => x.day_of_week === i + 1) ?? null
                          const isToday = s?.session_date === today
                          const isDone = s ? doneLogIds.has(s.id) : false
                          const isRest = s?.type === 'rest'

                          const cell = (
                            <div
                              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-sm border p-1 text-center ${
                                isToday
                                  ? 'border-primary bg-primary/10'
                                  : isDone
                                    ? 'border-border bg-muted/60'
                                    : 'border-border bg-background'
                              }`}
                            >
                              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                {day}
                              </span>
                              {s ? (
                                isRest ? (
                                  <span className="text-[10px] text-muted-foreground">Rest</span>
                                ) : (
                                  <>
                                    <span className="line-clamp-2 text-[10px] leading-tight">
                                      {shortLabel(s)}
                                    </span>
                                    {isDone && (
                                      <span
                                        aria-hidden
                                        className="text-[10px] leading-none text-primary"
                                      >
                                        ✓
                                      </span>
                                    )}
                                  </>
                                )
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                          )

                          if (!s || isRest) return <li key={i}>{cell}</li>
                          return (
                            <li key={i}>
                              <Link
                                href={`/session/${s.session_date}`}
                                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {cell}
                              </Link>
                            </li>
                          )
                        })}
                      </ol>

                      {adaptation && (
                        <p className="prose-readable text-xs text-muted-foreground">
                          <span className="section-eyebrow">
                            Adaptation · {adaptation.decision}
                          </span>{' '}
                          — {adaptation.reasoning}
                        </p>
                      )}
                    </section>
                  )
                })}
              </div>
            </details>
          )
        })}
    </div>
  )
}

function shortLabel(s: Session): string {
  if (s.name) return s.name
  if (s.type === 'conditioning') return 'Cond'
  if (s.type === 'hybrid') return 'Hybrid'
  return 'Sesh'
}

function formatIsoShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
