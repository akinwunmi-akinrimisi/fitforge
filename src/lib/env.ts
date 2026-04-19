import 'server-only'
import { z } from 'zod'

/**
 * Env validation is split by concern so that `next build`'s prerender phase
 * (which doesn't have runtime secrets) doesn't trip on service-role-only vars.
 *
 * - `getServerEnv()` — anon + public config. Needed by the per-request
 *   Supabase client. Safe to call from Server Components.
 * - `getServiceRoleKey()` — the service-role JWT. Only call this from
 *   `createSupabaseServiceRoleClient()` in `lib/supabase/server.ts`. Throws
 *   at the call site if missing, instead of tripping every render.
 */

const publicServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_APP_TZ: z.string().default('Africa/Lagos'),
})

export type ServerEnv = z.infer<typeof publicServerEnvSchema>

let cached: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cached) return cached
  const parsed = publicServerEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid or missing server env vars: ${missing}`)
  }
  cached = parsed.data
  return cached
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key.length < 20) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing at runtime. ' +
        'This should never happen in production — check your .env / Docker secrets.',
    )
  }
  return key
}

export function getCronSharedSecret(): string {
  const secret = process.env.CRON_SHARED_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('CRON_SHARED_SECRET is missing at runtime.')
  }
  return secret
}
