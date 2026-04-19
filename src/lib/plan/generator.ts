/**
 * Plan generator — turns a UserProfile into a complete 90-day Plan.
 *
 * Pure function. No I/O. Deterministic: same profile → same Plan.
 *
 * Consumers:
 *   - `src/seed/run.ts` calls this and persists the result via `persist.ts`.
 *   - M5 adaptation engine reads the generated plan, then WRITES week-level
 *     modifications back into the DB (loads, volume). The generator itself
 *     only produces the INITIAL plan.
 *
 * See docs/specs/plan-generator-spec.md.
 */
import type {
  CardioBlock,
  MobilityBlock,
  Phase,
  PhaseName,
  Plan,
  Session,
  SessionExercise,
  WarmupBlock,
  Week,
} from '@/domain/plan'
import { DELOAD_WEEKS, phaseForWeek } from '@/domain/plan'
import type { UserProfile } from '@/domain/profile'
import { userProfileSchema } from '@/domain/profile'
import { weeklyMacros } from '@/lib/nutrition/macros'
import type { SessionBlueprint } from './phases'
import {
  DELOAD,
  phase1ConditioningForWeek,
  slotMapForPhase,
  startingLoadKgForExerciseSlug,
  weeklyLoadDeltaKg,
} from './phases'

const DAYS_PER_WEEK = 7

/** Week numbers in which each phase runs. */
const PHASE_WEEKS: Record<PhaseName, number[]> = {
  foundation: [1, 2, 3, 4],
  build: [5, 6, 7, 8],
  reveal: [9, 10, 11, 12],
  peak: [13],
}

/** Phase 4 (Peak) only covers 6 days (days 85-90). Everything else is 7. */
const PHASE_DAYS_OVERRIDE: Partial<Record<PhaseName, number>> = {
  peak: 6,
}

export function generatePlan(profile: UserProfile): Plan {
  const parsed = userProfileSchema.parse(profile)
  const phases = (['foundation', 'build', 'reveal', 'peak'] as const).map((name, idx) =>
    buildPhase(name, (idx + 1) as 1 | 2 | 3 | 4, parsed),
  )
  // After building per-phase independently, we assign calendar day numbers + dates
  // in strictly increasing order across the whole plan.
  stitchDayNumbers(phases, parsed.startDate)
  return {
    profileId: parsed.id,
    startDate: parsed.startDate,
    phases: phases as unknown as Plan['phases'],
  }
}

// ---------------------------------------------------------------------------
// Phase construction
// ---------------------------------------------------------------------------

function buildPhase(name: PhaseName, number: 1 | 2 | 3 | 4, profile: UserProfile): Phase {
  const weekNumbers = PHASE_WEEKS[name]
  const weeks: Week[] = weekNumbers.map((weekNumber) => buildWeek(weekNumber, profile))
  return { number, name, weeks }
}

function buildWeek(weekNumber: number, profile: UserProfile): Week {
  const phase = phaseForWeek(weekNumber)
  const isDeload = DELOAD_WEEKS.includes(weekNumber)

  const macros = weeklyMacros({
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activityLevel,
    phase,
  })

  const slotMap = slotMapForPhase(phase)
  const daysInThisWeek = PHASE_DAYS_OVERRIDE[phase] ?? DAYS_PER_WEEK
  const sessions: Session[] = []

  for (let slotIdx = 0; slotIdx < DAYS_PER_WEEK; slotIdx++) {
    const bp = slotIdx < daysInThisWeek ? slotMap[slotIdx] : restDayBlueprint()
    if (!bp) {
      sessions.push(toRestSession())
      continue
    }
    sessions.push(blueprintToSession(bp, { weekNumber, profile, isDeload }))
  }

  // `Session` requires a length-7 array. If phase had fewer days, we've
  // padded with rest sessions already.
  return {
    number: weekNumber,
    isDeload,
    targetKcal: macros.kcal,
    macros: { proteinG: macros.proteinG, carbsG: macros.carbsG, fatG: macros.fatG },
    sessions,
  }
}

// ---------------------------------------------------------------------------
// Session assembly
// ---------------------------------------------------------------------------

type BuildContext = {
  weekNumber: number
  profile: UserProfile
  isDeload: boolean
}

function blueprintToSession(bp: SessionBlueprint, ctx: BuildContext): Session {
  // Special-case Phase 1 conditioning: steady-state → intervals at week 3+.
  const cardio = adjustCardio(bp, ctx)

  return {
    // dayNumber + dayOfWeek are assigned by stitchDayNumbers after all
    // phases are built. Placeholders for now.
    dayNumber: 1,
    dayOfWeek: 0,
    type: bp.type,
    name: bp.name,
    exercises: bp.exercises.map((slot, index) => buildSessionExercise(slot, index, ctx)),
    cardio,
    warmup: bp.warmup,
    mobilityBlock: bp.mobility,
  }
}

function adjustCardio(bp: SessionBlueprint, ctx: BuildContext): CardioBlock | null {
  if (!bp.cardio) return null
  const phase = phaseForWeek(ctx.weekNumber)
  if (phase === 'foundation' && bp.name === 'Conditioning 1') {
    const phaseWeek = ((ctx.weekNumber - 1) % 4) + 1
    return phase1ConditioningForWeek(phaseWeek)
  }
  return bp.cardio
}

function buildSessionExercise(
  slot: SessionBlueprint['exercises'][number],
  order: number,
  ctx: BuildContext,
): SessionExercise {
  const load = computeTargetLoad(slot, ctx)
  const sets = ctx.isDeload ? Math.min(slot.sets, DELOAD.setCap) : slot.sets
  const restSeconds = slot.restSeconds
  const notes = ctx.isDeload
    ? appendNote(slot.notes, `Deload — stop ${DELOAD.repsInReserve} reps short of failure.`)
    : slot.notes

  return {
    order,
    exerciseSlug: slot.slug,
    targetSets: sets,
    targetRepsMin: slot.repsMin,
    targetRepsMax: slot.repsMax,
    targetLoadKg: load,
    restSeconds,
    tempo: slot.tempo,
    notes,
  }
}

function computeTargetLoad(
  slot: SessionBlueprint['exercises'][number],
  ctx: BuildContext,
): number | null {
  // Only loaded roles get a concrete load. Core + mobility + warmup return null.
  const loadedRoles = new Set([
    'main-compound-lower',
    'main-compound-upper',
    'secondary',
    'accessory',
  ])
  if (!loadedRoles.has(slot.role)) return null

  // Week 1 of the whole plan: RPE-driven. We return null so the UI surfaces
  // an RPE 7 target and the user logs actual load.
  if (ctx.weekNumber === 1) return null

  const startingLoad = startingLoadKgForExerciseSlug(slot.slug, ctx.profile.weightKg)
  if (startingLoad == null) return null

  // Load progresses linearly by role-based delta starting from week 2.
  // Deload weeks override to 60% of week-3 load (approximates spec).
  if (ctx.isDeload) {
    const lastProgressedWeek = previousNonDeloadWeek(ctx.weekNumber)
    const fullLoad = loadAtWeek(slot, ctx, lastProgressedWeek, startingLoad)
    return roundToIncrement(fullLoad * DELOAD.loadMultiplier, deloadIncrement(slot.slug))
  }

  return loadAtWeek(slot, ctx, ctx.weekNumber, startingLoad)
}

/**
 * Load at a given week number, progressing linearly from the starting load
 * beginning at week 2. Applies the phase-spec caps so aggressive templates
 * can't compound past safe rates.
 *
 * Rounding increment matches the effective delta — otherwise snapping a 1.25 kg
 * delta to 2.5 kg plates would produce jumps of 0 or 2.5, violating the cap.
 */
function loadAtWeek(
  slot: SessionBlueprint['exercises'][number],
  ctx: BuildContext,
  weekNumber: number,
  startingLoad: number,
): number {
  const weeksOfProgress = Math.max(0, weekNumber - 2)
  const delta = effectiveDelta(slot, weekNumber)

  // Phase 4 (peak) freezes load at the end of phase 3.
  const phase = phaseForWeek(weekNumber)
  const cappedWeek = phase === 'peak' ? 12 : weekNumber
  const cappedWeeksOfProgress = Math.max(0, cappedWeek - 2)
  const weeksToUse = Math.min(weeksOfProgress, cappedWeeksOfProgress)

  // Snap the starting load to a coarse plate resolution, then add deltas that
  // round to the delta's own resolution — this preserves the week-over-week cap.
  const startSnapped = roundToIncrement(startingLoad, 2.5)
  const deltaStep = delta >= 2.5 ? 2.5 : delta >= 1.25 ? 1.25 : 1
  return roundToIncrement(startSnapped + delta * weeksToUse, deltaStep)
}

/** Deload rounding increment — 40% cut, rounding loose is fine. */
function deloadIncrement(slug: string): number {
  return isBarbellLift(slug) && LOWER_BARBELL.has(slug) ? 2.5 : 1.25
}

const LOWER_BARBELL = new Set([
  'barbell-back-squat',
  'front-squat',
  'pause-squat',
  'conventional-deadlift',
  'romanian-deadlift',
  'trap-bar-deadlift',
  'hip-thrust',
])

/** Phase-aware progression delta (kg/week) for a given exercise slot. */
function effectiveDelta(slot: SessionBlueprint['exercises'][number], weekNumber: number): number {
  const base = weeklyLoadDeltaKg(slot.role, slot.slug)
  const phase = phaseForWeek(weekNumber)
  // Phase 3 says "conservative (1 kg/week or hold)" on main compounds.
  if (phase === 'reveal' && slot.role.startsWith('main-compound')) return Math.min(base, 1)
  return base
}

function previousNonDeloadWeek(weekNumber: number): number {
  return weekNumber - 1
}

function isBarbellLift(slug: string): boolean {
  return BARBELL_LIFTS.has(slug)
}

const BARBELL_LIFTS = new Set([
  'barbell-back-squat',
  'front-squat',
  'pause-squat',
  'conventional-deadlift',
  'romanian-deadlift',
  'trap-bar-deadlift',
  'hip-thrust',
  'barbell-bench-press',
  'close-grip-bench-press',
  'overhead-press',
  'barbell-row',
  'barbell-curl',
])

function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment
}

function appendNote(existing: string | null, suffix: string): string {
  if (!existing || existing.trim() === '') return suffix
  return `${existing} ${suffix}`
}

// ---------------------------------------------------------------------------
// Day numbering (global 1-90) + dayOfWeek (Sunday = 0)
// ---------------------------------------------------------------------------

function stitchDayNumbers(phases: Phase[], startDate: string): void {
  const start = new Date(`${startDate}T00:00:00Z`)
  const startDow = start.getUTCDay()
  let dayCounter = 1
  for (const phase of phases) {
    for (const week of phase.weeks) {
      const daysInThisWeek = PHASE_DAYS_OVERRIDE[phase.name] ?? DAYS_PER_WEEK
      for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const session = week.sessions[i]
        if (!session) continue
        if (i < daysInThisWeek) {
          session.dayNumber = dayCounter
          session.dayOfWeek = ((startDow + dayCounter - 1) % 7) as Session['dayOfWeek']
          dayCounter++
        } else {
          // Pad position beyond phase 4's 6 days — mark as a placeholder rest
          // with a synthesized dayNumber past 90 that persistence will skip.
          session.dayNumber = 91
          session.dayOfWeek = 0
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rest day helpers
// ---------------------------------------------------------------------------

function restDayBlueprint(): SessionBlueprint {
  return {
    name: 'Rest',
    type: 'rest',
    warmup: null,
    mobility: {
      durationMinutes: 10,
      exerciseSlugs: ['couch-stretch', 'pigeon-pose', 'thoracic-rotation-quadruped', 'wall-slides'],
    } satisfies MobilityBlock,
    cardio: null,
    exercises: [],
  }
}

function toRestSession(): Session {
  return {
    dayNumber: 91,
    dayOfWeek: 0,
    type: 'rest',
    name: 'Rest',
    exercises: [],
    cardio: null,
    warmup: null satisfies WarmupBlock | null,
    mobilityBlock: null,
  }
}
