import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email')

export const magicLinkSchema = z
  .object({
    email: emailSchema,
    next: z.string().startsWith('/').optional(),
  })
  .strict()

export type MagicLinkInput = z.infer<typeof magicLinkSchema>

export const passwordSignInSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters').max(200),
    next: z.string().startsWith('/').optional(),
  })
  .strict()

export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>
