import { z } from 'zod'

export const dailyCheckinInputSchema = z
  .object({
    checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sleepHours: z.number().min(0).max(20).optional(),
    energy: z.number().int().min(1).max(5).optional(),
    soreness: z.number().int().min(1).max(5).optional(),
    note: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.sleepHours !== undefined || v.energy !== undefined || v.soreness !== undefined, {
    message: 'Provide at least one of sleep, energy, or soreness.',
  })

export type DailyCheckinInput = z.infer<typeof dailyCheckinInputSchema>
