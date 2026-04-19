import { z } from 'zod'

export const phaseNameEnum = z.enum(['foundation', 'build', 'reveal', 'peak'])
export type PhaseName = z.infer<typeof phaseNameEnum>

export const sessionTypeEnum = z.enum(['strength', 'conditioning', 'hybrid', 'rest'])
export type SessionType = z.infer<typeof sessionTypeEnum>

/** Target set/rep prescription for one exercise slot in a session. */
export const sessionExerciseSchema = z
  .object({
    order: z.number().int().nonnegative(),
    exerciseSlug: z.string().regex(/^[a-z0-9-]+$/),
    targetSets: z.number().int().min(1).max(10),
    targetRepsMin: z.number().int().min(1).max(100),
    targetRepsMax: z.number().int().min(1).max(100),
    /** null for bodyweight or week-1 RPE-driven loads. */
    targetLoadKg: z.number().nonnegative().nullable(),
    restSeconds: z.number().int().nonnegative().default(90),
    tempo: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .strict()
  .refine((v) => v.targetRepsMax >= v.targetRepsMin, {
    message: 'targetRepsMax must be >= targetRepsMin',
  })
export type SessionExercise = z.infer<typeof sessionExerciseSchema>

/** Cardio prescription attached to a session. Null when no cardio scheduled. */
export const cardioBlockSchema = z
  .object({
    modality: z.enum([
      'treadmill',
      'bike',
      'rower',
      'sled',
      'assault_bike',
      'outdoor_walk',
      'outdoor_run',
    ]),
    kind: z.enum(['steady_state', 'intervals', 'complex']),
    /** Free-form duration + intensity description, e.g. "40 min @ RPE 5" or
     * "8 × 1 min @ 8 km/h / 2 min @ 5 km/h". */
    prescription: z.string(),
    targetRpe: z.number().min(1).max(10).nullable(),
    targetDurationMinutes: z.number().int().positive().nullable(),
  })
  .strict()
export type CardioBlock = z.infer<typeof cardioBlockSchema>

export const warmupBlockSchema = z
  .object({
    durationMinutes: z.number().int().min(3).max(20),
    exerciseSlugs: z.array(z.string()).min(1),
    /** Mandatory by policy — the UI does not let the user skip this block. */
    mandatory: z.literal(true).default(true),
  })
  .strict()
export type WarmupBlock = z.infer<typeof warmupBlockSchema>

export const mobilityBlockSchema = z
  .object({
    durationMinutes: z.number().int().min(1).max(30),
    exerciseSlugs: z.array(z.string()),
  })
  .strict()
export type MobilityBlock = z.infer<typeof mobilityBlockSchema>

export const sessionSchema = z
  .object({
    dayNumber: z.number().int().min(1).max(90),
    dayOfWeek: z.number().int().min(0).max(6),
    type: sessionTypeEnum,
    name: z.string(),
    exercises: z.array(sessionExerciseSchema),
    cardio: cardioBlockSchema.nullable(),
    warmup: warmupBlockSchema.nullable(),
    mobilityBlock: mobilityBlockSchema.nullable(),
  })
  .strict()
export type Session = z.infer<typeof sessionSchema>

export const weekSchema = z
  .object({
    number: z.number().int().min(1).max(13),
    isDeload: z.boolean(),
    targetKcal: z.number().int().min(1200).max(6000),
    macros: z
      .object({
        proteinG: z.number().int().nonnegative(),
        carbsG: z.number().int().nonnegative(),
        fatG: z.number().int().nonnegative(),
      })
      .strict(),
    sessions: z.array(sessionSchema).length(7),
  })
  .strict()
export type Week = z.infer<typeof weekSchema>

export const phaseSchema = z
  .object({
    number: z.number().int().min(1).max(4),
    name: phaseNameEnum,
    weeks: z.array(weekSchema).min(1),
  })
  .strict()
export type Phase = z.infer<typeof phaseSchema>

export const planSchema = z
  .object({
    profileId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    phases: z.tuple([phaseSchema, phaseSchema, phaseSchema, phaseSchema]),
  })
  .strict()
export type Plan = z.infer<typeof planSchema>

/** Convenience: map a week number (1-13) to its phase. */
export function phaseForWeek(weekNumber: number): PhaseName {
  if (weekNumber <= 4) return 'foundation'
  if (weekNumber <= 8) return 'build'
  if (weekNumber <= 12) return 'reveal'
  return 'peak'
}

/** Which weeks are mandatory deloads. */
export const DELOAD_WEEKS: ReadonlyArray<number> = [4, 8, 12]

/** Expected fat-loss rate per phase (kg/week) — used by the adaptation engine. */
export const PHASE_TARGET_LOSS_KG_PER_WEEK: Record<PhaseName, number> = {
  foundation: 0.6,
  build: 0.8,
  reveal: 0.7,
  peak: 0.0,
}
