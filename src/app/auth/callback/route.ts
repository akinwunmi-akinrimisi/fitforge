import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Handles the magic-link / OAuth redirect. Exchanges the code for a session
 * and bounces the user to `next` (or the dashboard).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const nextParam = url.searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('auth callback exchange failed', { status: error.status })
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url))
  }

  return NextResponse.redirect(new URL(next, request.url))
}
