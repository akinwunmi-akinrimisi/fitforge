import { z } from 'zod'

export const setLogSchema = z
  .object({
    sessionId: z.string().uuid(),
    sessionExerciseId: z.string().uuid(),
    setNumber: z.number().int().min(1).max(30),
    weightKg: z.number().min(0).max(500).nullable(),
    reps: z.number().int().min(0).max(200),
    rpe: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict()
export type SetLogInput = z.infer<typeof setLogSchema>

export const cardioLogSchema = z
  .object({
    sessionId: z.string().uuid(),
    modality: z.enum([
      'treadmill',
      'bike',
      'rower',
      'sled',
      'assault_bike',
      'outdoor_walk',
      'outdoor_run',
    ]),
    durationSeconds: z.number().int().positive().max(14_400),
    distanceM: z.number().nonnegative().optional(),
    avgHr: z.number().int().min(40).max(230).optional(),
    rpe: z.number().int().min(1).max(10),
    notes: z.string().max(500).optional(),
  })
  .strict()
export type CardioLogInput = z.infer<typeof cardioLogSchema>

export const painNoteSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    sessionExerciseId: z.string().uuid().optional(),
    location: z.string().trim().min(1).max(80),
    severity: z.number().int().min(1).max(10),
    note: z.string().max(500).optional(),
  })
  .strict()
export type PainNoteInput = z.infer<typeof painNoteSchema>

export const sessionReflectionSchema = z
  .object({
    sessionId: z.string().uuid(),
    overallRpe: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict()
export type SessionReflectionInput = z.infer<typeof sessionReflectionSchema>
