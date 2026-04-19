import { describe, it, expect } from 'vitest'
import { generatePlan } from './generator'
import type { UserProfile } from '@/domain/profile'
import { DELOAD_WEEKS, phaseForWeek } from '@/domain/plan'

const ownerProfile: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  sex: 'male',
  age: 34,
  heightCm: 183,
  weightKg: 101,
  experience: 'returner',
  activityLevel: 'moderate',
  cardioBaselineMinutesAt6kmh: 60,
  sessionsPerWeek: 5,
  sessionDurationMinutes: 90,
  trainingTime: 'morning_fasted',
  timezone: 'Africa/Lagos',
  goals: ['fat_loss', 'muscle_gain', 'conditioning', 'facial_fat'],
  startDate: '2026-04-20',
}

describe('generatePlan — structure', () => {
  const plan = generatePlan(ownerProfile)

  it('has exactly 4 phases', () => {
    expect(plan.phases.length).toBe(4)
    expect(plan.phases.map((p) => p.name)).toEqual(['foundation', 'build', 'reveal', 'peak'])
  })

  it('has 13 weeks total (4 + 4 + 4 + 1)', () => {
    const weekCount = plan.phases.reduce((acc, p) => acc + p.weeks.length, 0)
    expect(weekCount).toBe(13)
    expect(plan.phases[0].weeks.length).toBe(4)
    expect(plan.phases[1].weeks.length).toBe(4)
    expect(plan.phases[2].weeks.length).toBe(4)
    expect(plan.phases[3].weeks.length).toBe(1)
  })

  it('has exactly 90 non-filler sessions across the plan', () => {
    const sessions = plan.phases
      .flatMap((p) => p.weeks)
      .flatMap((w) => w.sessions)
      .filter((s) => s.dayNumber >= 1 && s.dayNumber <= 90)
    expect(sessions.length).toBe(90)
  })

  it('assigns day numbers 1..90 strictly increasing', () => {
    const days = plan.phases
      .flatMap((p) => p.weeks)
      .flatMap((w) => w.sessions)
      .filter((s) => s.dayNumber <= 90)
      .map((s) => s.dayNumber)
    expect(days).toEqual(Array.from({ length: 90 }, (_, i) => i + 1))
  })

  it('phase boundaries land at days 29 (build), 57 (reveal), 85 (peak)', () => {
    const phaseOfDay = (d: number) =>
      plan.phases
        .flatMap((p) =>
          p.weeks.flatMap((w) => w.sessions.map((s) => [p.name, s.dayNumber] as const)),
        )
        .find(([, day]) => day === d)?.[0]
    expect(phaseOfDay(28)).toBe('foundation')
    expect(phaseOfDay(29)).toBe('build')
    expect(phaseOfDay(56)).toBe('build')
    expect(phaseOfDay(57)).toBe('reveal')
    expect(phaseOfDay(84)).toBe('reveal')
    expect(phaseOfDay(85)).toBe('peak')
    expect(phaseOfDay(90)).toBe('peak')
  })
})

describe('generatePlan — deloads', () => {
  const plan = generatePlan(ownerProfile)

  it('marks weeks 4, 8, 12 as deloads', () => {
    for (const week of plan.phases.flatMap((p) => p.weeks)) {
      expect(week.isDeload).toBe(DELOAD_WEEKS.includes(week.number))
    }
  })

  it('week 4 load on back squat is approximately 60% of week 3', () => {
    const weeks = plan.phases.flatMap((p) => p.weeks)
    const week3 = weeks.find((w) => w.number === 3)!
    const week4 = weeks.find((w) => w.number === 4)!

    const w3Squat = firstSquat(week3)
    const w4Squat = firstSquat(week4)

    expect(w3Squat).not.toBeNull()
    expect(w4Squat).not.toBeNull()
    const ratio = (w4Squat! as number) / (w3Squat! as number)
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.65)
  })

  it('week 4 caps set counts (setCap 2)', () => {
    const week4 = plan.phases.flatMap((p) => p.weeks).find((w) => w.number === 4)!
    for (const session of week4.sessions) {
      for (const ex of session.exercises) {
        expect(ex.targetSets).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe('generatePlan — macros per week', () => {
  const plan = generatePlan(ownerProfile)

  it('kcal never below 1900 floor', () => {
    for (const week of plan.phases.flatMap((p) => p.weeks)) {
      expect(week.targetKcal).toBeGreaterThanOrEqual(1900)
    }
  })

  it('foundation weeks hit the ~2583 kcal target', () => {
    const foundation = plan.phases[0].weeks
    for (const w of foundation) {
      expect(w.targetKcal).toBe(2583)
    }
  })

  it('reveal week targets are lower than foundation', () => {
    const foundationKcal = plan.phases[0].weeks[0]!.targetKcal
    const revealKcal = plan.phases[2].weeks[0]!.targetKcal
    expect(revealKcal).toBeLessThan(foundationKcal)
  })

  it('peak week returns to maintenance (~3083 kcal)', () => {
    const peakKcal = plan.phases[3].weeks[0]!.targetKcal
    expect(peakKcal).toBe(3083)
  })
})

describe('generatePlan — load progression caps', () => {
  const plan = generatePlan(ownerProfile)

  it('back squat never jumps more than 2.5 kg week-to-week in phase 1', () => {
    const weeks = plan.phases[0].weeks // weeks 1-4
    const w1 = firstSquat(weeks[0]!) // null (RPE-driven)
    const w2 = firstSquat(weeks[1]!) as number
    const w3 = firstSquat(weeks[2]!) as number
    expect(w1).toBeNull()
    expect(w3 - w2).toBeLessThanOrEqual(2.5)
  })

  it('bench press never jumps more than 1.25 kg week-to-week in phase 2', () => {
    const weeks = plan.phases[1].weeks // weeks 5-8
    const loads = weeks
      .slice(0, 3)
      .map((w) => firstBench(w))
      .filter((l): l is number => l !== null)
    for (let i = 1; i < loads.length; i++) {
      expect(loads[i]! - loads[i - 1]!).toBeLessThanOrEqual(1.25)
    }
  })

  it('phase 3 main lifts progress at ≤ 1 kg/week', () => {
    const weeks = plan.phases[2].weeks // weeks 9-12
    const squats = weeks
      .slice(0, 3)
      .map((w) => firstSquat(w))
      .filter((l): l is number => l !== null)
    for (let i = 1; i < squats.length; i++) {
      expect(squats[i]! - squats[i - 1]!).toBeLessThanOrEqual(1)
    }
  })

  it('week 1 loads are all null (RPE-driven)', () => {
    const week1 = plan.phases[0].weeks[0]!
    const loadedCompoundSlugs = [
      'barbell-bench-press',
      'overhead-press',
      'goblet-squat',
      'romanian-deadlift',
    ]
    for (const slug of loadedCompoundSlugs) {
      const ex = week1.sessions.flatMap((s) => s.exercises).find((e) => e.exerciseSlug === slug)
      if (ex) {
        expect(ex.targetLoadKg).toBeNull()
      }
    }
  })
})

describe('generatePlan — safety & warmup', () => {
  const plan = generatePlan(ownerProfile)

  it('every strength session has a warmup block attached', () => {
    const strengthSessions = plan.phases
      .flatMap((p) => p.weeks)
      .flatMap((w) => w.sessions)
      .filter((s) => s.type === 'strength' && s.dayNumber <= 90)
    for (const s of strengthSessions) {
      expect(s.warmup).not.toBeNull()
      expect(s.warmup?.mandatory).toBe(true)
    }
  })

  it('rest days carry only a mobility block, no warmup', () => {
    const restSessions = plan.phases
      .flatMap((p) => p.weeks)
      .flatMap((w) => w.sessions)
      .filter((s) => s.type === 'rest' && s.dayNumber <= 90)
    for (const s of restSessions) {
      expect(s.warmup).toBeNull()
      expect(s.mobilityBlock).not.toBeNull()
    }
  })

  it('phase 1 conditioning switches steady-state → intervals in week 3', () => {
    const weeks = plan.phases[0].weeks
    const findConditioning = (w: (typeof weeks)[number]) =>
      w.sessions.find((s) => s.type === 'conditioning')
    const w1 = findConditioning(weeks[0]!)?.cardio
    const w3 = findConditioning(weeks[2]!)?.cardio
    expect(w1?.kind).toBe('steady_state')
    expect(w3?.kind).toBe('intervals')
  })

  it('day 90 is the reassessment session', () => {
    const day90 = plan.phases
      .flatMap((p) => p.weeks)
      .flatMap((w) => w.sessions)
      .find((s) => s.dayNumber === 90)
    expect(day90?.name).toMatch(/reassessment/i)
  })
})

describe('generatePlan — determinism', () => {
  it('same profile produces the same plan (deep equality)', () => {
    const a = generatePlan(ownerProfile)
    const b = generatePlan(ownerProfile)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('generatePlan — phase relationship to week number', () => {
  it('phaseForWeek matches phase nav expectations', () => {
    expect(phaseForWeek(1)).toBe('foundation')
    expect(phaseForWeek(4)).toBe('foundation')
    expect(phaseForWeek(5)).toBe('build')
    expect(phaseForWeek(8)).toBe('build')
    expect(phaseForWeek(9)).toBe('reveal')
    expect(phaseForWeek(12)).toBe('reveal')
    expect(phaseForWeek(13)).toBe('peak')
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstSquat(week: ReturnType<typeof generatePlan>['phases'][number]['weeks'][number]) {
  for (const s of week.sessions) {
    for (const e of s.exercises) {
      if (
        e.exerciseSlug === 'barbell-back-squat' ||
        e.exerciseSlug === 'goblet-squat' ||
        e.exerciseSlug === 'front-squat'
      ) {
        return e.targetLoadKg
      }
    }
  }
  return null
}

function firstBench(week: ReturnType<typeof generatePlan>['phases'][number]['weeks'][number]) {
  for (const s of week.sessions) {
    for (const e of s.exercises) {
      if (e.exerciseSlug === 'barbell-bench-press') {
        return e.targetLoadKg
      }
    }
  }
  return null
}
