/**
 * Weekly recalibration engine.
 *
 * The PURE core (`decide()`) takes a snapshot of the closed week and emits
 * the adaptation for the next week. The ORCHESTRATOR (`weeklyRecalibrate`)
 * pulls the snapshot from the DB, runs `decide()`, clamps via guardrails,
 * and writes the `adaptations` row.
 *
 * Spec: docs/specs/adaptation-engine-spec.md.
 */
import type {
  Adaptation,
  AdaptationChanges,
  AdaptationDecision,
  DailyCheckinSummary,
  NutritionDaySummary,
  PainNoteSummary,
  RecalibrationInput,
  SessionLogSummary,
  WeighInSummary,
} from '@/domain/adaptation'
import {
  FORCED_DELOAD_WEEKS,
  PHASE_TARGET_LOSS_KG_PER_WEEK,
  phaseForWeek,
} from '@/domain/adaptation'
import { applyGuardrails, maxWeeklyDeltaKg } from './guardrails'

// ---------------------------------------------------------------------------
// Compliance scoring
// ---------------------------------------------------------------------------

/** Training compliance = completed sessions / planned sessions (0..1). */
export function trainingCompliance(sessions: SessionLogSummary[]): number {
  if (sessions.length === 0) return 0
  const completed = sessions.filter((s) => s.completed).length
  return completed / sessions.length
}

/** A day is nutrition-compliant if kcal within ±10% AND protein ≥ 90% of target. */
export function isCompliantDay(day: NutritionDaySummary): boolean {
  const kcalLow = day.targetKcal * 0.9
  const kcalHigh = day.targetKcal * 1.1
  const kcalOk = day.kcal >= kcalLow && day.kcal <= kcalHigh
  const proteinOk = day.proteinG >= day.targetProteinG * 0.9
  return kcalOk && proteinOk
}

export function nutritionCompliance(days: NutritionDaySummary[]): number {
  // Spec divides by 7 — days WITHOUT a log are treated as non-compliant.
  return days.filter(isCompliantDay).length / 7
}

export function averageSleep(checkins: DailyCheckinSummary[]): number | null {
  const withSleep = checkins
    .map((c) => c.sleepHours)
    .filter((h): h is number => typeof h === 'number' && h > 0)
  if (withSleep.length === 0) return null
  return withSleep.reduce((a, b) => a + b, 0) / withSleep.length
}

// ---------------------------------------------------------------------------
// Decision tree — pure
// ---------------------------------------------------------------------------

export type DecideOutput = {
  decision: AdaptationDecision
  changes: AdaptationChanges
  flags: string[]
  /** The sentence(s) that form the root of the reasoning. Guardrail clamps append more. */
  reasoningSeed: string
}

export type DecideInput = {
  weekNumber: number
  composite: number
  training: number
  nutrition: number
  trend7dKg: number | null
  painNotes: PainNoteSummary[]
  avgSleep: number | null
  consecutiveSlowWeeks: number
  /** Exercise slugs the adaptation should consider for progression (top-compound short list). */
  focusLifts: string[]
}

/**
 * Spec §Decision tree — order matters; the first matching rule fires.
 * Guardrails are applied AFTER this function (via `applyGuardrails`).
 */
export function decide(input: DecideInput): DecideOutput {
  const {
    weekNumber,
    composite,
    training,
    nutrition,
    trend7dKg,
    painNotes,
    avgSleep,
    consecutiveSlowWeeks,
    focusLifts,
  } = input
  const phase = phaseForWeek(weekNumber)
  const phaseTargetLoss = PHASE_TARGET_LOSS_KG_PER_WEEK[phase]

  // 1. Forced deload — next week is already a deload/peak week.
  if (FORCED_DELOAD_WEEKS.includes(weekNumber + 1)) {
    return {
      decision: 'deload_forced',
      changes: noChange(),
      flags: ['forced_deload'],
      reasoningSeed: `Week ${weekNumber + 1} — scheduled deload. Volume and intensity reduced per plan. This week is intentional; the next block starts fresh.`,
    }
  }

  // 2. Red-flag pain interrupt — any severity ≥ 6 caps next session.
  const severePain = painNotes.find((p) => p.severity >= 6)
  if (severePain) {
    return {
      decision: 'pain_interrupt',
      changes: {
        kcalDelta: 0,
        loadAdjustments: [], // no progression on affected pattern; generator skips the bump
        volumeAdjustment: 0.7,
      },
      flags: ['pain_interrupt'],
      reasoningSeed: `${formatCompliance(training, nutrition)} — ${severePain.location} pain flagged (severity ${severePain.severity}). Capping volume at 70% next week, holding loads. Recovery note surfaced.`,
    }
  }

  // 3. Sleep floor — if average sleep < 6 h, hold loads.
  if (avgSleep !== null && avgSleep < 6) {
    return {
      decision: 'sleep_hold',
      changes: noChange(),
      flags: ['sleep_floor'],
      reasoningSeed: `Average sleep ${round1(avgSleep)} hours over the week. Holding loads — training adaptation requires recovery. Prioritize sleep before pushing volume.`,
    }
  }

  // 4. High compliance on-track → progress
  if (composite >= 0.9 && trend7dKg !== null) {
    const delta = trend7dKg - -phaseTargetLoss // positive = losing as expected
    if (Math.abs(delta) <= 0.2) {
      return {
        decision: 'progress',
        changes: {
          kcalDelta: 0,
          loadAdjustments: focusLifts.map((slug) => ({
            exerciseSlug: slug,
            deltaKg: maxWeeklyDeltaKg(slug), // uncapped in the tree — guardrail will cap anyway
          })),
          volumeAdjustment: 1.0,
        },
        flags: ['on_track'],
        reasoningSeed: `Strong week — ${formatCompliance(training, nutrition)}, weight trend ${formatTrend(trend7dKg)} (target ${formatTrend(-phaseTargetLoss)}). Progressing loads.`,
      }
    }

    // 5. High compliance + trend too fast — hold loads + warn
    if (trend7dKg < -phaseTargetLoss - 0.4) {
      return {
        decision: 'hold',
        changes: noChange(),
        flags: ['loss_too_fast', 'muscle_loss_risk'],
        reasoningSeed: `${formatCompliance(training, nutrition)} — trend ${formatTrend(trend7dKg)} is faster than the ${formatTrend(-phaseTargetLoss)} target. Holding loads; not cutting kcal further. Aggressive loss risks muscle loss.`,
      }
    }

    // 6. High compliance + trend too slow (2 weeks) — kcal -100
    if (trend7dKg > -phaseTargetLoss + 0.3 && consecutiveSlowWeeks >= 1) {
      return {
        decision: 'reduce',
        changes: { kcalDelta: -100, loadAdjustments: [], volumeAdjustment: 1.0 },
        flags: ['slow_loss_two_weeks'],
        reasoningSeed: `${formatCompliance(training, nutrition)} — trend ${formatTrend(trend7dKg)} below ${formatTrend(-phaseTargetLoss)} target for 2 consecutive weeks. Reducing kcal by 100.`,
      }
    }

    // Mild slow — hold for one week
    return {
      decision: 'hold',
      changes: noChange(),
      flags: ['slow_loss_one_week'],
      reasoningSeed: `${formatCompliance(training, nutrition)} — trend ${formatTrend(trend7dKg)} slightly off target. Holding one more week before adjusting.`,
    }
  }

  // 7. Medium compliance — hold
  if (composite >= 0.7) {
    return {
      decision: 'hold',
      changes: noChange(),
      flags: ['medium_compliance'],
      reasoningSeed: `Mixed week — ${formatCompliance(training, nutrition)}. Holding loads and macros to consolidate. Aim for ≥ 5/7 nutrition days next week.`,
    }
  }

  // 8. Low compliance — reduce volume
  return {
    decision: 'reduce',
    changes: { kcalDelta: 0, loadAdjustments: [], volumeAdjustment: 0.85 },
    flags: ['low_compliance'],
    reasoningSeed: `Tough week — ${formatCompliance(training, nutrition)}. Reducing volume 15% to make next week more sustainable. What got in the way?`,
  }
}

function noChange(): AdaptationChanges {
  return { kcalDelta: 0, loadAdjustments: [], volumeAdjustment: 1.0 }
}

function formatCompliance(training: number, nutrition: number): string {
  return `${pct(training)} training, ${pct(nutrition)} nutrition`
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

function formatTrend(kg: number): string {
  const rounded = round1(kg)
  return rounded > 0 ? `+${rounded} kg` : `${rounded} kg`
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

// ---------------------------------------------------------------------------
// End-to-end pure orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs compliance scoring + `decide()` + `applyGuardrails()` and returns the
 * Adaptation row to persist. Still pure — no I/O.
 */
export function buildAdaptation(
  input: RecalibrationInput,
  currentWeekKcal: number,
  focusLifts: string[],
): Adaptation {
  const training = trainingCompliance(input.sessions)
  const nutrition = nutritionCompliance(input.nutritionEntries)
  const composite = 0.5 * training + 0.5 * nutrition

  const avgSleep = averageSleep(input.checkins)

  const consecutiveSlowWeeks = isPreviousSlow(input) ? 1 : 0

  const trend7dKg = input.weighIn?.trend7dKg ?? null

  const decideOut = decide({
    weekNumber: input.weekNumber,
    composite,
    training,
    nutrition,
    trend7dKg,
    painNotes: input.painNotes,
    avgSleep,
    consecutiveSlowWeeks,
    focusLifts,
  })

  const clamped = applyGuardrails({
    kcalDelta: decideOut.changes.kcalDelta,
    volumeAdjustment: decideOut.changes.volumeAdjustment,
    loadAdjustments: decideOut.changes.loadAdjustments,
    currentKcal: currentWeekKcal,
  })

  const reasoning = clamped.clampNotes.length
    ? `${decideOut.reasoningSeed} Safety: ${clamped.clampNotes.join(' ')}`
    : decideOut.reasoningSeed

  return {
    profileId: input.profileId,
    planId: input.planId,
    weekNumberClosed: input.weekNumber,
    weekNumberAdjusted: input.weekNumber + 1,
    compositeScore: round3(composite),
    trainingCompliance: round3(training),
    nutritionCompliance: round3(nutrition),
    trendKg: trend7dKg,
    decision: decideOut.decision,
    changes: {
      kcalDelta: clamped.kcalDelta,
      loadAdjustments: clamped.loadAdjustments,
      volumeAdjustment: clamped.volumeAdjustment,
    },
    reasoning,
    flags: decideOut.flags,
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

function isPreviousSlow(input: RecalibrationInput): boolean {
  // If the most recent stored adaptation's decision is 'hold' with a slow flag
  // (proxy: lastAdaptation.decision is 'hold' and we saw a slow-loss trend
  // already), treat THIS week as 2nd consecutive.
  if (!input.lastAdaptation) return false
  return (
    input.lastAdaptation.decision === 'hold' &&
    input.trendKgPrev !== null &&
    input.trendKgPrev > -0.3
  )
}

// Re-exports for callers
export type {
  Adaptation,
  AdaptationChanges,
  AdaptationDecision,
  RecalibrationInput,
  WeighInSummary,
}
