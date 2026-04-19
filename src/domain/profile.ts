import { z } from 'zod'

export const sexEnum = z.enum(['male', 'female'])
export type Sex = z.infer<typeof sexEnum>

export const experienceEnum = z.enum(['beginner', 'returner', 'intermediate', 'advanced'])
export type Experience = z.infer<typeof experienceEnum>

export const goalEnum = z.enum(['fat_loss', 'muscle_gain', 'conditioning', 'facial_fat'])
export type Goal = z.infer<typeof goalEnum>

export const activityLevelEnum = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
])
export type ActivityLevel = z.infer<typeof activityLevelEnum>

export const userProfileSchema = z
  .object({
    id: z.string().uuid(),
    sex: sexEnum,
    age: z.number().int().min(14).max(120),
    heightCm: z.number().positive().max(260),
    weightKg: z.number().positive().max(400),
    experience: experienceEnum,
    activityLevel: activityLevelEnum.default('moderate'),
    cardioBaselineMinutesAt6kmh: z.number().min(0).max(240),
    sessionsPerWeek: z.number().int().min(1).max(7),
    sessionDurationMinutes: z.number().int().min(15).max(240),
    trainingTime: z.enum(['morning_fasted', 'midday', 'evening']),
    timezone: z.string().default('Africa/Lagos'),
    goals: z.array(goalEnum).min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  })
  .strict()

export type UserProfile = z.infer<typeof userProfileSchema>
