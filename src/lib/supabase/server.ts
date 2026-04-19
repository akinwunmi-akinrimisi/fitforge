import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from './types'
import { getServerEnv, getServiceRoleKey } from '@/lib/env'

/**
 * Request-scoped Supabase client backed by the user's session cookie.
 * Use this inside Server Components, Server Actions, and Route Handlers.
 * RLS is enforced — this is the default.
 */
export function createSupabaseServerClient() {
  const env = getServerEnv()
  const cookieStore = cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — cookies can only be set in
            // Server Actions / Route Handlers. Middleware also handles refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // See note above.
          }
        },
      },
    },
  )
}

/**
 * Service-role Supabase client. BYPASSES RLS. Use only for:
 *  - migrations / seed scripts
 *  - scheduled jobs (cron) that must operate across users
 *  - admin operations
 *
 * NEVER call this from a code path that serves a user request without an
 * explicit authorization check in the calling Server Action.
 */
export function createSupabaseServiceRoleClient() {
  const env = getServerEnv()
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), {
    cookies: {
      get: () => undefined,
      set: () => undefined,
      remove: () => undefined,
    },
  })
}
