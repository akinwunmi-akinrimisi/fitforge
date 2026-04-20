import { z } from 'zod'

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export const sessionLogSummarySchema = z
  .object({
    sessionId: z.string().uuid(),
    plannedSets: z.number().int().nonnegative(),
    completedSets: z.number().int().nonnegative(),
    completed: z.boolean(),
    exerciseSlugs: z.array(z.string()),
  })
  .strict()
export type SessionLogSummary = z.infer<typeof sessionLogSummarySchema>

export const nutritionDaySummarySchema = z
  .object({
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kcal: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    targetKcal: z.number().positive(),
    targetProteinG: z.number().positive(),
  })
  .strict()
export type NutritionDaySummary = z.infer<typeof nutritionDaySummarySchema>

export const dailyCheckinSummarySchema = z
  .object({
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sleepHours: z.number().nullable(),
    energy: z.number().int().min(1).max(5).nullable(),
    soreness: z.number().int().min(1).max(5).nullable(),
  })
  .strict()
export type DailyCheckinSummary = z.infer<typeof dailyCheckinSummarySchema>

export const painNoteSummarySchema = z
  .object({
    location: z.string(),
    severity: z.number().int().min(1).max(10),
    exerciseSlug: z.string().nullable(),
  })
  .strict()
export type PainNoteSummary = z.infer<typeof painNoteSummarySchema>

export const weighInSummarySchema = z
  .object({
    kg: z.number().positive(),
    trend7dKg: z.number(),
  })
  .strict()
export type WeighInSummary = z.infer<typeof weighInSummarySchema>

export const recalibrationInputSchema = z
  .object({
    profileId: z.string().uuid(),
    planId: z.string().uuid(),
    weekNumber: z.number().int().min(1).max(13),
    sessions: z.array(sessionLogSummarySchema),
    nutritionEntries: z.array(nutritionDaySummarySchema),
    checkins: z.array(dailyCheckinSummarySchema),
    weighIn: weighInSummarySchema.nullable(),
    painNotes: z.array(painNoteSummarySchema),
    lastAdaptation: z
      .object({
        decision: z.string(),
        weekNumberClosed: z.number().int(),
      })
      .nullable(),
    /** Observed weight change per week. Null if no prior adaptation. */
    trendKgPrev: z.number().nullable(),
  })
  .strict()
export type RecalibrationInput = z.infer<typeof recalibrationInputSchema>

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export const decisionEnum = z.enum([
  'progress',
  'hold',
  'reduce',
  'deload_forced',
  'pain_interrupt',
  'sleep_hold',
])
export type AdaptationDecision = z.infer<typeof decisionEnum>

export const loadAdjustmentSchema = z
  .object({
    exerciseSlug: z.string(),
    deltaKg: z.number(),
  })
  .strict()

export const changesSchema = z
  .object({
    kcalDelta: z.number(),
    loadAdjustments: z.array(loadAdjustmentSchema),
    volumeAdjustment: z.number().min(0.5).max(1.2),
  })
  .strict()
export type AdaptationChanges = z.infer<typeof changesSchema>

export const adaptationSchema = z
  .object({
    profileId: z.string().uuid(),
    planId: z.string().uuid(),
    weekNumberClosed: z.number().int().min(1).max(13),
    weekNumberAdjusted: z.number().int().min(1).max(14),
    compositeScore: z.number().min(0).max(1),
    trainingCompliance: z.number().min(0).max(1),
    nutritionCompliance: z.number().min(0).max(1),
    trendKg: z.number().nullable(),
    decision: decisionEnum,
    changes: changesSchema,
    reasoning: z.string(),
    flags: z.array(z.string()),
  })
  .strict()
export type Adaptation = z.infer<typeof adaptationSchema>

// ---------------------------------------------------------------------------
// Phase target loss rates (kg/week) — re-exported from plan for one source of truth
// ---------------------------------------------------------------------------

import { PHASE_TARGET_LOSS_KG_PER_WEEK, phaseForWeek } from './plan'
export { PHASE_TARGET_LOSS_KG_PER_WEEK, phaseForWeek }

/** The forced-deload weeks per the plan. */
export const FORCED_DELOAD_WEEKS: ReadonlyArray<number> = [4, 8, 12, 13]
