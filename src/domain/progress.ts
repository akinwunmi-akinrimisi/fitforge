import { z } from 'zod'

export const bodyMetricInputSchema = z
  .object({
    measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weightKg: z.number().min(20).max(400).optional(),
    waistCm: z.number().min(30).max(200).optional(),
    hipCm: z.number().min(30).max(200).optional(),
    chestCm: z.number().min(50).max(200).optional(),
    neckCm: z.number().min(20).max(80).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.weightKg !== undefined ||
      v.waistCm !== undefined ||
      v.hipCm !== undefined ||
      v.chestCm !== undefined ||
      v.neckCm !== undefined,
    { message: 'Provide at least one measurement.' },
  )
export type BodyMetricInput = z.infer<typeof bodyMetricInputSchema>

export const photoKindEnum = z.enum(['body', 'face'])
export type PhotoKind = z.infer<typeof photoKindEnum>

export const photoViewEnum = z.enum(['front', 'side', 'back', 'profile'])
export type PhotoView = z.infer<typeof photoViewEnum>

export const photoUploadRequestSchema = z
  .object({
    takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: photoKindEnum,
    view: photoViewEnum,
  })
  .strict()
export type PhotoUploadRequest = z.infer<typeof photoUploadRequestSchema>

export const photoCommitSchema = z
  .object({
    takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: photoKindEnum,
    view: photoViewEnum,
    storagePath: z.string().min(1),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    bytes: z.number().int().positive().optional(),
  })
  .strict()
export type PhotoCommitInput = z.infer<typeof photoCommitSchema>

/** Valid kind/view combinations per security.md. */
export const VALID_COMBOS: ReadonlyArray<{ kind: PhotoKind; view: PhotoView }> = [
  { kind: 'body', view: 'front' },
  { kind: 'body', view: 'side' },
  { kind: 'body', view: 'back' },
  { kind: 'face', view: 'front' },
  { kind: 'face', view: 'profile' },
]

export function isValidCombo(kind: PhotoKind, view: PhotoView): boolean {
  return VALID_COMBOS.some((c) => c.kind === kind && c.view === view)
}

export function storagePath(
  userId: string,
  takenOn: string,
  kind: PhotoKind,
  view: PhotoView,
): string {
  return `${userId}/${takenOn}/${kind}-${view}.webp`
}
