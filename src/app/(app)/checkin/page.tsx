import { createSupabaseServerClient } from '@/lib/supabase/server'
import { todayLagosKey, formatLagos } from '@/lib/dates/lagos'
import { CheckinForm } from './checkin-form'
import { Toaster } from '@/components/ui/toaster'

export const dynamic = 'force-dynamic'

export default async function CheckinPage() {
  const today = todayLagosKey()
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: existing } = user
    ? await supabase
        .from('daily_checkins')
        .select('id, sleep_hours, energy, soreness, note')
        .eq('profile_id', user.id)
        .eq('check_date', today)
        .maybeSingle()
    : { data: null }

  return (
    <section className="space-y-8 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Check-in · {today}</p>
        <h1 className="font-display text-4xl leading-[1.05]">
          {formatLagos(new Date(), 'EEEE')} morning.
        </h1>
        <p className="prose-readable text-sm text-muted-foreground">
          Fifteen seconds. The adaptation engine uses this to tell if you need a lighter week.
        </p>
      </header>

      <CheckinForm checkDate={today} existing={existing ?? null} />
      <Toaster />
    </section>
  )
}
