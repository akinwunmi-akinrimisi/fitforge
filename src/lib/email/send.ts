/**
 * Lightweight Resend HTTP wrapper for app-side transactional email.
 *
 * Not used today. Lives here so M5's weekly adaptation summary and future
 * opt-in notifications (e.g. "time for your weigh-in") have a ready-to-call
 * entrypoint. Magic-link auth emails are NOT handled here — those go through
 * the Supabase GoTrue SMTP config, which is currently configured at the
 * Supabase container level on the shared VPS.
 *
 * @server-only
 */
import 'server-only'

type SendEmailInput = {
  to: string | string[]
  subject: string
  /** HTML body. Plain-text fallback auto-derived by Resend if `text` omitted. */
  html: string
  text?: string
  /** Optional override; defaults to RESEND_SENDER. */
  from?: string
  /** Optional tags for Resend's analytics. */
  tags?: Array<{ name: string; value: string }>
}

export type SendEmailResult = { ok: true; id: string } | { ok: false; message: string }

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const defaultFrom = process.env.RESEND_SENDER
  if (!apiKey) return { ok: false, message: 'RESEND_API_KEY is not configured' }
  if (!input.from && !defaultFrom) {
    return { ok: false, message: 'RESEND_SENDER is not configured and no from= override supplied' }
  }

  const body: Record<string, unknown> = {
    from: input.from ?? defaultFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
  }
  if (input.text) body.text = input.text
  if (input.tags) body.tags = input.tags

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return {
        ok: false,
        message: `Resend ${res.status} ${res.statusText}`,
      }
    }
    const json = (await res.json()) as { id?: string }
    if (!json.id) return { ok: false, message: 'Resend returned no id' }
    return { ok: true, id: json.id }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Network error' }
  }
}
