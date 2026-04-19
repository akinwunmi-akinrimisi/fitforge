'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { magicLinkSchema, passwordSignInSchema } from '@/lib/validation/auth'

type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function sendMagicLink(formData: FormData): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid email' }
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(parsed.data.next ?? '/dashboard')}`,
      shouldCreateUser: true,
    },
  })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('sendMagicLink error', { code: error.status })
    return { ok: false, message: 'Could not send sign-in link. Try again.' }
  }

  return { ok: true, message: 'Check your email for a sign-in link.' }
}

export async function signInWithPassword(formData: FormData): Promise<ActionResult> {
  const parsed = passwordSignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { ok: false, message: 'Invalid email or password.' }
  }

  redirect(parsed.data.next ?? '/dashboard')
}
