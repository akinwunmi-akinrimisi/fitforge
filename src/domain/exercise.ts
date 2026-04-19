import { z } from 'zod'

export const exerciseCategoryEnum = z.enum([
  'push',
  'pull',
  'squat',
  'hinge',
  'carry',
  'core',
  'conditioning',
  'mobility',
  'warmup',
])
export type ExerciseCategory = z.infer<typeof exerciseCategoryEnum>

export const equipmentEnum = z.enum([
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'bodyweight',
  'band',
  'treadmill',
  'bike',
  'rower',
  'sled',
  'assault_bike',
])
export type Equipment = z.infer<typeof equipmentEnum>

export const difficultyEnum = z.enum(['beginner', 'intermediate', 'advanced'])
export type Difficulty = z.infer<typeof difficultyEnum>

export const movementPhaseEnum = z.enum([
  'setup',
  'eccentric',
  'bottom',
  'concentric',
  'lockout',
])
export type MovementPhase = z.infer<typeof movementPhaseEnum>

export const exerciseSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
    name: z.string().min(1),
    category: exerciseCategoryEnum,
    primary_muscles: z.array(z.string()).min(1),
    secondary_muscles: z.array(z.string()),
    equipment: z.array(equipmentEnum).min(1),
    difficulty: difficultyEnum,
    gif_url: z.string().url(),

    posture_cues: z.array(z.string()).min(3).max(6),
    benefits: z.object({
      physiological: z.array(z.string()).min(1),
      aesthetic: z.array(z.string()),
      functional: z.array(z.string()),
    }),
    movement_steps: z
      .array(
        z.object({
          phase: movementPhaseEnum,
          instruction: z.string(),
        }),
      )
      .min(3),
    safety_warnings: z.array(z.string()).min(1),
    contraindications: z.array(z.string()),
    body_changes_to_watch: z.object({
      green_flags: z.array(z.string()).min(1),
      red_flags: z.array(z.string()).min(1),
    }),
    common_mistakes: z
      .array(
        z.object({
          mistake: z.string(),
          correction: z.string(),
        }),
      )
      .min(3)
      .max(5),
    progression: z.string().nullable(),
    regression: z.string().nullable(),

    default_sets: z.tuple([z.number(), z.number()]),
    default_reps: z.tuple([z.number(), z.number()]),
    default_rest_seconds: z.number(),
    tempo: z.string().nullable(),
  })
  .strict()

export type Exercise = z.infer<typeof exerciseSchema>
