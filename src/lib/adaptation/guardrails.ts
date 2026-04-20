/**
 * Hard caps applied AFTER the decision tree. Decisions can never exceed these,
 * regardless of compliance or trend. If a guardrail clamps a value, the clamp
 * is logged in the `reasoning` field so the user can see why.
 *
 * Source: docs/specs/adaptation-engine-spec.md §Guardrails.
 */

export const GUARDRAILS = {
  /** Max kg per week on lower-body compound lifts (squat, deadlift family). */
  LOWER_COMPOUND_MAX_KG_PER_WEEK: 2.5,
  /** Max kg per week on upper-body compound lifts (bench, OHP, barbell row). */
  UPPER_COMPOUND_MAX_KG_PER_WEEK: 1.25,
  /** Max kg per week on isolations / accessories. */
  ISOLATION_MAX_KG_PER_WEEK: 1.0,
  /** Max week-over-week volume increase (as multiplier). 1.10 = +10%. */
  VOLUME_MAX_INCREASE: 1.1,
  /** Max week-over-week volume decrease (as multiplier). 0.7 = -30%. */
  VOLUME_MAX_DECREASE: 0.7,
  /** Max automatic kcal decrease per week. */
  KCAL_AUTO_DECREASE_MAX: 100,
  /** Hard floor on any auto-calculated kcal target. */
  KCAL_FLOOR: 1900,
} as const

export const LOWER_COMPOUND_SLUGS = new Set<string>([
  'barbell-back-squat',
  'front-squat',
  'pause-squat',
  'conventional-deadlift',
  'romanian-deadlift',
  'trap-bar-deadlift',
  'hip-thrust',
])

export const UPPER_COMPOUND_SLUGS = new Set<string>([
  'barbell-bench-press',
  'close-grip-bench-press',
  'overhead-press',
  'barbell-row',
])

export type LiftClass = 'lower_compound' | 'upper_compound' | 'isolation'

export function classifyLift(slug: string): LiftClass {
  if (LOWER_COMPOUND_SLUGS.has(slug)) return 'lower_compound'
  if (UPPER_COMPOUND_SLUGS.has(slug)) return 'upper_compound'
  return 'isolation'
}

export function maxWeeklyDeltaKg(slug: string): number {
  switch (classifyLift(slug)) {
    case 'lower_compound':
      return GUARDRAILS.LOWER_COMPOUND_MAX_KG_PER_WEEK
    case 'upper_compound':
      return GUARDRAILS.UPPER_COMPOUND_MAX_KG_PER_WEEK
    case 'isolation':
      return GUARDRAILS.ISOLATION_MAX_KG_PER_WEEK
  }
}

export type ClampReport = {
  /** The clamped changes. */
  kcalDelta: number
  volumeAdjustment: number
  loadAdjustments: Array<{ exerciseSlug: string; deltaKg: number }>
  /** Human-readable clamp messages appended to the reasoning. */
  clampNotes: string[]
}

/**
 * Clamp raw adaptation changes to guardrail caps.
 * Pure function — no I/O, no side effects.
 */
export function applyGuardrails(input: {
  kcalDelta: number
  volumeAdjustment: number
  loadAdjustments: Array<{ exerciseSlug: string; deltaKg: number }>
  currentKcal: number
}): ClampReport {
  const notes: string[] = []

  // kcal: only auto-DECREASE is capped; auto-increase isn't a safety concern.
  let kcalDelta = input.kcalDelta
  if (kcalDelta < -GUARDRAILS.KCAL_AUTO_DECREASE_MAX) {
    notes.push(
      `kcal decrease clamped from ${kcalDelta} to -${GUARDRAILS.KCAL_AUTO_DECREASE_MAX} (weekly cap).`,
    )
    kcalDelta = -GUARDRAILS.KCAL_AUTO_DECREASE_MAX
  }
  const nextKcal = input.currentKcal + kcalDelta
  if (nextKcal < GUARDRAILS.KCAL_FLOOR) {
    const clamped = GUARDRAILS.KCAL_FLOOR - input.currentKcal
    notes.push(
      `kcal clamped at the ${GUARDRAILS.KCAL_FLOOR} floor (would have gone to ${nextKcal}).`,
    )
    kcalDelta = clamped
  }

  // volume multiplier
  let volumeAdjustment = input.volumeAdjustment
  if (volumeAdjustment > GUARDRAILS.VOLUME_MAX_INCREASE) {
    notes.push(
      `volume +${Math.round((volumeAdjustment - 1) * 100)}% clamped to +${Math.round((GUARDRAILS.VOLUME_MAX_INCREASE - 1) * 100)}%.`,
    )
    volumeAdjustment = GUARDRAILS.VOLUME_MAX_INCREASE
  } else if (volumeAdjustment < GUARDRAILS.VOLUME_MAX_DECREASE) {
    notes.push(
      `volume ${Math.round((volumeAdjustment - 1) * 100)}% clamped to ${Math.round((GUARDRAILS.VOLUME_MAX_DECREASE - 1) * 100)}%.`,
    )
    volumeAdjustment = GUARDRAILS.VOLUME_MAX_DECREASE
  }

  // load adjustments per slug
  const loadAdjustments = input.loadAdjustments.map((a) => {
    const cap = maxWeeklyDeltaKg(a.exerciseSlug)
    if (a.deltaKg > cap) {
      notes.push(`${a.exerciseSlug}: +${a.deltaKg} kg clamped to cap +${cap} kg.`)
      return { exerciseSlug: a.exerciseSlug, deltaKg: cap }
    }
    if (a.deltaKg < -cap) {
      notes.push(`${a.exerciseSlug}: ${a.deltaKg} kg clamped to -${cap} kg.`)
      return { exerciseSlug: a.exerciseSlug, deltaKg: -cap }
    }
    return a
  })

  return { kcalDelta, volumeAdjustment, loadAdjustments, clampNotes: notes }
}
