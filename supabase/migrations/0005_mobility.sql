-- ============================================================================
-- 0005 — Desk-worker mobility breaks (M6)
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- mobility_breaks — curated 3-exercise flows (seeded, shared across users)
-- ---------------------------------------------------------------------------
create table if not exists public.mobility_breaks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  focus text not null,
  duration_seconds integer not null check (duration_seconds between 30 and 600),
  exercise_slugs text[] not null check (array_length(exercise_slugs, 1) between 2 and 5),
  posture_cue text not null,
  created_at timestamptz not null default now()
);

alter table public.mobility_breaks enable row level security;

drop policy if exists "mobility_breaks: authenticated can read" on public.mobility_breaks;
create policy "mobility_breaks: authenticated can read"
  on public.mobility_breaks for select to authenticated using (true);
-- writes via service role only (seed).

-- ---------------------------------------------------------------------------
-- Seed the 4 default protocols
-- ---------------------------------------------------------------------------
insert into public.mobility_breaks (slug, name, focus, duration_seconds, exercise_slugs, posture_cue)
values
  (
    'hip-opener',
    'Hip Opener',
    'hip flexors',
    90,
    array['couch-stretch', 'pigeon-pose', 'hip-90-90'],
    'Tuck the pelvis before you stretch — the hip flexor has to take the load.'
  ),
  (
    'thoracic-extension',
    'Thoracic Extension',
    'upper back',
    90,
    array['thoracic-rotation-quadruped', 'wall-slides', 'cat-cow'],
    'Move from the rib cage; the low back stays still.'
  ),
  (
    'neck-retraction',
    'Neck Reset',
    'forward-head posture',
    60,
    array['neck-retraction', 'wall-slides', 'dead-hang'],
    'Think "double chin" — glide the head straight back, no tilt.'
  ),
  (
    'wrist-forearm',
    'Wrist + Forearm',
    'typing strain',
    60,
    array['scapular-push-ups', 'band-pull-apart', 'dead-hang'],
    'Slow, deliberate reps. Forearms thank you in 6 weeks.'
  )
on conflict (slug) do update
  set name = excluded.name,
      focus = excluded.focus,
      duration_seconds = excluded.duration_seconds,
      exercise_slugs = excluded.exercise_slugs,
      posture_cue = excluded.posture_cue;

-- ---------------------------------------------------------------------------
-- mobility_logs — one row per completed break
-- ---------------------------------------------------------------------------
create table if not exists public.mobility_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mobility_break_id uuid not null references public.mobility_breaks(id) on delete restrict,
  completed_on date not null,
  duration_seconds integer not null check (duration_seconds > 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mobility_logs_profile_date_idx
  on public.mobility_logs (profile_id, completed_on desc);
create index if not exists mobility_logs_break_idx
  on public.mobility_logs (mobility_break_id);

alter table public.mobility_logs enable row level security;

drop policy if exists "mobility_logs: owner can select" on public.mobility_logs;
create policy "mobility_logs: owner can select"
  on public.mobility_logs for select using (auth.uid() = profile_id);
drop policy if exists "mobility_logs: owner can insert" on public.mobility_logs;
create policy "mobility_logs: owner can insert"
  on public.mobility_logs for insert with check (auth.uid() = profile_id);
drop policy if exists "mobility_logs: owner can delete" on public.mobility_logs;
create policy "mobility_logs: owner can delete"
  on public.mobility_logs for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Profile extensions for notification schedule (soft-scheduled)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notification_times text[] not null default '{10:00,12:00,14:00,16:00}',
  add column if not exists push_subscriptions jsonb not null default '[]'::jsonb;

comment on column public.profiles.notification_times is
  'HH:MM local (Africa/Lagos by default) times to fire mobility-break reminders. Server wakes and pushes at these times once M6.5 push-subscription backend lands.';

commit;
