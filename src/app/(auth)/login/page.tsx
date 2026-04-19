import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : undefined

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-10 px-4">
      <div className="space-y-3">
        <p className="section-eyebrow">FitForge90</p>
        <h1 className="font-display text-4xl leading-[1.05]">Sign in.</h1>
        <p className="prose-readable text-sm text-muted-foreground">
          A sign-in link arrives in your inbox. No password required — but you can set
          one in settings if you prefer.
        </p>
      </div>
      <LoginForm next={next} />
    </main>
  )
}
