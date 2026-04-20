import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/toaster'
import { SettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('weight_kg, sessions_per_week, timezone, notification_times, email')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  return (
    <div className="space-y-10 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Settings</p>
        <h1 className="font-display text-4xl leading-[1.05]">Your setup.</h1>
      </header>

      <SettingsForm
        email={profile?.email ?? user?.email ?? ''}
        weightKg={profile?.weight_kg ?? null}
        sessionsPerWeek={profile?.sessions_per_week ?? null}
        timezone={profile?.timezone ?? 'Africa/Lagos'}
        notificationTimes={profile?.notification_times ?? []}
      />

      <section className="space-y-3 border border-border bg-card p-5">
        <p className="section-eyebrow">Export · CSV</p>
        <p className="prose-readable text-sm text-muted-foreground">
          Download your logs for your own analysis or portability. Each link returns a UTF-8 CSV of
          every row you own.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['sets', 'nutrition', 'weight', 'checkins', 'cardio'] as const).map((k) => (
            <a
              key={k}
              href={`/api/export?kind=${k}`}
              className="border border-border px-3 py-2 text-xs uppercase tracking-widest hover:bg-muted"
              download
            >
              {k}
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-2 border border-border bg-card p-5">
        <p className="section-eyebrow">Notifications</p>
        <p className="prose-readable text-sm text-muted-foreground">
          Default schedule for desk-mobility reminders: 10:00, 12:00, 14:00, 16:00 (Africa/Lagos).
          Web-push delivery activates once the push-subscription backend ships (M6.5). Your
          configured times are stored on your profile and will fire automatically at that point.
        </p>
      </section>

      <Toaster />
    </div>
  )
}
