import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PwaRegister } from '@/app/pwa-register'

export const dynamic = 'force-dynamic'

const navItems = [
  { href: '/dashboard', label: 'Today' },
  { href: '/session', label: 'Session' },
  { href: '/nutrition', label: 'Nutrition' },
  { href: '/progress', label: 'Progress' },
  { href: '/mobility', label: 'Mobility' },
  { href: '/settings', label: 'Settings' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1200px] flex-col px-4 pb-20">
      <PwaRegister />
      <header className="flex items-center justify-between py-6">
        <Link href="/dashboard" className="section-eyebrow">
          FitForge90
        </Link>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex-1">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-0 md:static md:mt-16 md:border-t-0"
      >
        <ul className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-2 py-2 md:gap-6 md:px-0 md:py-4">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block whitespace-nowrap px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
