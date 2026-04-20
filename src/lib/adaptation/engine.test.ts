import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type {
  DailyCheckinSummary,
  NutritionDaySummary,
  PainNoteSummary,
  RecalibrationInput,
  SessionLogSummary,
} from '@/domain/adaptation'
import {
  averageSleep,
  buildAdaptation,
  decide,
  isCompliantDay,
  nutritionCompliance,
  trainingCompliance,
} from './engine'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const PROFILE_ID = '11111111-1111-1111-1111-111111111111'
const PLAN_ID = '22222222-2222-2222-2222-222222222222'
const FOCUS = ['barbell-back-squat', 'barbell-bench-press', 'romanian-deadlift']

function session(completed: boolean, planned = 15, done = completed ? 15 : 7): SessionLogSummary {
  return {
    sessionId: '33333333-3333-3333-3333-333333333333',
    plannedSets: planned,
    completedSets: done,
    completed,
    exerciseSlugs: FOCUS,
  }
}

function nDays(count: number, kcal: number, proteinG = 200): NutritionDaySummary[] {
  const out: NutritionDaySummary[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      dateKey: `2026-04-${String(i + 1).padStart(2, '0')}`,
      kcal,
      proteinG,
      targetKcal: 2583,
      targetProteinG: 202,
    })
  }
  return out
}

function checkin(sleep: number | null = 7.5): DailyCheckinSummary {
  return {
    dateKey: '2026-04-01',
    sleepHours: sleep,
    energy: 3,
    soreness: 2,
  }
}

function baseInput(overrides: Partial<RecalibrationInput> = {}): RecalibrationInput {
  return {
    profileId: PROFILE_ID,
    planId: PLAN_ID,
    weekNumber: 2,
    sessions: [session(true), session(true), session(true), session(true), session(true)],
    nutritionEntries: nDays(7, 2583),
    checkins: Array(7).fill(checkin(7.5)),
    weighIn: { kg: 100, trend7dKg: -0.6 },
    painNotes: [],
    lastAdaptation: null,
    trendKgPrev: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Compliance helpers
// ---------------------------------------------------------------------------

describe('compliance helpers', () => {
  it('trainingCompliance = completed / planned', () => {
    expect(trainingCompliance([session(true), session(true), session(false)])).toBeCloseTo(2 / 3, 4)
  })

  it('trainingCompliance is 0 when no sessions', () => {
    expect(trainingCompliance([])).toBe(0)
  })

  it('isCompliantDay requires both kcal ±10% AND protein ≥ 90%', () => {
    const day: NutritionDaySummary = {
      dateKey: '2026-04-01',
      kcal: 2500,
      proteinG: 200,
      targetKcal: 2583,
      targetProteinG: 202,
    }
    expect(isCompliantDay(day)).toBe(true)
    expect(isCompliantDay({ ...day, kcal: 2000 })).toBe(false) // 22% under kcal
    expect(isCompliantDay({ ...day, proteinG: 150 })).toBe(false) // 74% of protein target
  })

  it('nutritionCompliance divides by 7 even when < 7 days logged', () => {
    const days = nDays(4, 2583)
    expect(nutritionCompliance(days)).toBeCloseTo(4 / 7, 4)
  })

  it('averageSleep ignores null entries', () => {
    expect(averageSleep([checkin(7), checkin(null), checkin(8)])).toBeCloseTo(7.5, 4)
  })
})

// ---------------------------------------------------------------------------
// 12 required spec scenarios — decision tree
// ---------------------------------------------------------------------------

describe('decide — 12 spec scenarios', () => {
  // 1. Forced deload week 4 → next is week 5, but spec says forced deload if
  //    next week ∈ {4,8,12,13}. So closing week 3 next=4 → forced. Let's test both.
  it('1. forced deload fires when next week is 4', () => {
    const out = decide({
      weekNumber: 3,
      composite: 1.0,
      training: 1.0,
      nutrition: 1.0,
      trend7dKg: -0.6,
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('deload_forced')
    expect(out.changes.loadAdjustments).toEqual([])
  })

  it('1b. forced deload fires when next week is 13 (peak)', () => {
    const out = decide({
      weekNumber: 12,
      composite: 1.0,
      training: 1.0,
      nutrition: 1.0,
      trend7dKg: -0.7,
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('deload_forced')
  })

  // 2. High compliance on-track
  it('2. high compliance + on-track trend → progress with per-lift deltas', () => {
    const out = decide({
      weekNumber: 2,
      composite: 0.95,
      training: 1,
      nutrition: 0.9,
      trend7dKg: -0.6,
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('progress')
    expect(out.changes.loadAdjustments.length).toBe(3)
  })

  // 3. High compliance + trend too fast
  it('3. high compliance + fast loss → hold with muscle_loss_risk flag', () => {
    const out = decide({
      weekNumber: 2,
      composite: 0.95,
      training: 1,
      nutrition: 0.9,
      trend7dKg: -1.5, // phase-1 target is -0.6; -1.5 < -0.6 - 0.4 = -1.0
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('hold')
    expect(out.flags).toContain('muscle_loss_risk')
  })

  // 4. High compliance + slow loss 1 week → hold
  it('4. high compliance + slow-loss one week → hold', () => {
    const out = decide({
      weekNumber: 2,
      composite: 0.95,
      training: 1,
      nutrition: 0.9,
      trend7dKg: -0.1, // slower than -0.6 by 0.5 > 0.3 threshold, 1 week only
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('hold')
    expect(out.flags).toContain('slow_loss_one_week')
  })

  // 5. High compliance + slow loss 2 consecutive weeks → kcal -100
  it('5. high compliance + slow-loss two weeks → reduce (kcal -100)', () => {
    const out = decide({
      weekNumber: 2,
      composite: 0.95,
      training: 1,
      nutrition: 0.9,
      trend7dKg: -0.1,
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 1,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('reduce')
    expect(out.changes.kcalDelta).toBe(-100)
  })

  // 6. Medium compliance
  it('6. medium compliance → hold', () => {
    const out = decide({
      weekNumber: 2,
      composite: 0.75,
      training: 0.8,
      nutrition: 0.7,
      trend7dKg: -0.6,
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('hold')
    expect(out.flags).toContain('medium_compliance')
  })

  // 7. Low compliance
  it('7. low compliance → reduce (-15% volume)', () => {
    const out = decide({
      weekNumber: 2,
      composite: 0.5,
      training: 0.4,
      nutrition: 0.6,
      trend7dKg: null,
      painNotes: [],
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('reduce')
    expect(out.changes.volumeAdjustment).toBeCloseTo(0.85, 4)
  })

  // 8. Pain severity 7 fires regardless of compliance
  it('8. pain note severity 7 → pain_interrupt regardless of compliance', () => {
    const painNotes: PainNoteSummary[] = [
      { location: 'lower back', severity: 7, exerciseSlug: 'barbell-back-squat' },
    ]
    const out = decide({
      weekNumber: 2,
      composite: 1.0,
      training: 1,
      nutrition: 1,
      trend7dKg: -0.6,
      painNotes,
      avgSleep: 7.5,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('pain_interrupt')
    expect(out.changes.volumeAdjustment).toBeCloseTo(0.7, 4)
  })

  // 9. Sleep floor
  it('9. avg sleep 5.8h → sleep_hold regardless of compliance', () => {
    const out = decide({
      weekNumber: 2,
      composite: 1.0,
      training: 1,
      nutrition: 1,
      trend7dKg: -0.6,
      painNotes: [],
      avgSleep: 5.8,
      consecutiveSlowWeeks: 0,
      focusLifts: FOCUS,
    })
    expect(out.decision).toBe('sleep_hold')
  })

  // 12. First-week: lastAdaptation null, engine still runs cleanly
  it('12. first-week (no prior adaptation) still produces a valid decision', () => {
    const input = baseInput({ weekNumber: 1, lastAdaptation: null, trendKgPrev: null })
    const adaptation = buildAdaptation(input, 2583, FOCUS)
    expect(['progress', 'hold', 'reduce']).toContain(adaptation.decision)
    expect(adaptation.reasoning.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Guardrail clamp logged in reasoning
// ---------------------------------------------------------------------------

describe('guardrails integration', () => {
  it('10. clamp applied: decide says +2.5 kg, squat cap is 2.5 kg — no clamp note', () => {
    const input = baseInput({ weekNumber: 2 })
    const adaptation = buildAdaptation(input, 2583, ['barbell-back-squat'])
    expect(adaptation.changes.loadAdjustments[0]?.deltaKg).toBe(2.5)
    expect(adaptation.reasoning).not.toMatch(/clamped/)
  })

  it('10b. overreach via composite noChange guardrail — volume -30% already at cap', () => {
    const input = baseInput({
      weekNumber: 2,
      sessions: [session(false), session(false), session(false), session(false), session(false)],
      nutritionEntries: nDays(2, 3000),
    })
    const adaptation = buildAdaptation(input, 2583, FOCUS)
    expect(adaptation.decision).toBe('reduce')
    expect(adaptation.changes.volumeAdjustment).toBeGreaterThanOrEqual(0.7)
  })

  it('11. kcal floor: reveal phase, small user slow for 2 weeks — clamped at 1900', () => {
    // Build a realistic small-user scenario: kcalDelta -100 would take the
    // current week's target of 1950 down to 1850 — the floor clamps at 1900.
    // High compliance is required to reach the slow-loss-2-weeks branch, so
    // nutrition targets/actuals must align to 1950 to keep the days compliant.
    const smallUserDays: NutritionDaySummary[] = Array.from({ length: 7 }, (_, i) => ({
      dateKey: `2026-07-${String(i + 1).padStart(2, '0')}`,
      kcal: 1950,
      proteinG: 120,
      targetKcal: 1950,
      targetProteinG: 120,
    }))
    const input = baseInput({
      weekNumber: 10,
      sessions: [session(true), session(true), session(true), session(true), session(true)],
      nutritionEntries: smallUserDays,
      weighIn: { kg: 60, trend7dKg: -0.1 }, // reveal target is -0.7; -0.1 > -0.7 + 0.3 = slow
      lastAdaptation: { decision: 'hold', weekNumberClosed: 9 },
      trendKgPrev: -0.2,
    })
    const adaptation = buildAdaptation(input, 1950, FOCUS)
    expect(adaptation.decision).toBe('reduce')
    // kcal clamp: -100 would take 1950 -> 1850, clamped to -50 (1900 floor).
    expect(adaptation.changes.kcalDelta).toBe(-50)
    expect(adaptation.reasoning).toMatch(/floor/)
  })
})

// ---------------------------------------------------------------------------
// Property-based — for any valid input, output stays in safe bands
// ---------------------------------------------------------------------------

describe('property-based envelope', () => {
  it('decision always in allowed enum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 13 }),
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        fc.option(fc.float({ min: Math.fround(-3), max: Math.fround(1), noNaN: true }), {
          nil: null,
        }),
        fc.integer({ min: 0, max: 10 }),
        fc.float({ min: Math.fround(4), max: Math.fround(10), noNaN: true }),
        (weekNumber, training, nutrition, trend, severeCount, avgSleep) => {
          const pains: PainNoteSummary[] = Array.from({ length: severeCount }, () => ({
            location: 'knee',
            severity: 7,
            exerciseSlug: null,
          }))
          const composite = 0.5 * training + 0.5 * nutrition
          const out = decide({
            weekNumber,
            composite,
            training,
            nutrition,
            trend7dKg: trend,
            painNotes: pains,
            avgSleep,
            consecutiveSlowWeeks: 0,
            focusLifts: FOCUS,
          })
          expect([
            'progress',
            'hold',
            'reduce',
            'deload_forced',
            'pain_interrupt',
            'sleep_hold',
          ]).toContain(out.decision)
          expect(out.changes.volumeAdjustment).toBeGreaterThanOrEqual(0.7)
          expect(out.changes.volumeAdjustment).toBeLessThanOrEqual(1.1)
          expect(out.changes.kcalDelta).toBeGreaterThanOrEqual(-100)
          expect(out.changes.kcalDelta).toBeLessThanOrEqual(200)
        },
      ),
    )
  })
})
