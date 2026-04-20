-- ============================================================================
-- 0004 — Progress tracking + adaptation engine (M5)
--   - adaptations           : one row per weekly recalibration
--   - body_metrics          : weekly weight + optional measurements
--   - progress_photos       : metadata rows; files live in Supabase Storage
--   - progress-photos bucket: private, per-user folder, signed URLs only
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- adaptations — one row per week the engine runs
-- ---------------------------------------------------------------------------
create table if not exists public.adaptations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,

  -- The week that just closed (1-13). weekNumberAdjusted is usually +1.
  week_number_closed smallint not null check (week_number_closed between 1 and 13),
  week_number_adjusted smallint not null check (week_number_adjusted between 1 and 14),

  -- Compliance scores (0..1)
  composite_score numeric(4, 3) not null check (composite_score >= 0 and composite_score <= 1),
  training_compliance numeric(4, 3) not null check (training_compliance >= 0 and training_compliance <= 1),
  nutrition_compliance numeric(4, 3) not null check (nutrition_compliance >= 0 and nutrition_compliance <= 1),

  -- Trend weight vs expected (nullable if no weigh-in yet)
  trend_kg numeric(6, 2),

  decision text not null check (decision in (
    'progress', 'hold', 'reduce', 'deload_forced', 'pain_interrupt', 'sleep_hold'
  )),

  -- changes JSONB:
  --   { kcalDelta: number, loadAdjustments: Array<{exerciseSlug, deltaKg}>, volumeAdjustment: number }
  changes jsonb not null default '{}'::jsonb,

  reasoning text not null,

  -- Safety flags the engine chose to surface
  flags text[] not null default '{}',

  created_at timestamptz not null default now(),
  unique (profile_id, week_number_closed)
);

create index if not exists adaptations_profile_idx on public.adaptations (profile_id, week_number_closed desc);

alter table public.adaptations enable row level security;

drop policy if exists "adaptations: owner can select" on public.adaptations;
create policy "adaptations: owner can select"
  on public.adaptations for select using (auth.uid() = profile_id);
drop policy if exists "adaptations: owner can insert" on public.adaptations;
create policy "adaptations: owner can insert"
  on public.adaptations for insert with check (auth.uid() = profile_id);
-- No owner update/delete — adaptations are historical. Service role can edit
-- if a bug slipped through, which still passes since it bypasses RLS.

-- ---------------------------------------------------------------------------
-- body_metrics — weekly weight (Sunday) + optional measurements
-- ---------------------------------------------------------------------------
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 2) check (weight_kg is null or (weight_kg > 20 and weight_kg < 400)),
  waist_cm numeric(5, 2) check (waist_cm is null or (waist_cm > 30 and waist_cm < 200)),
  hip_cm numeric(5, 2) check (hip_cm is null or (hip_cm > 30 and hip_cm < 200)),
  chest_cm numeric(5, 2) check (chest_cm is null or (chest_cm > 50 and chest_cm < 200)),
  neck_cm numeric(5, 2) check (neck_cm is null or (neck_cm > 20 and neck_cm < 80)),
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, measured_on)
);

create index if not exists body_metrics_profile_date_idx
  on public.body_metrics (profile_id, measured_on desc);

drop trigger if exists body_metrics_set_updated_at on public.body_metrics;
create trigger body_metrics_set_updated_at
  before update on public.body_metrics
  for each row execute function public.set_updated_at();

alter table public.body_metrics enable row level security;

drop policy if exists "body_metrics: owner can select" on public.body_metrics;
create policy "body_metrics: owner can select"
  on public.body_metrics for select using (auth.uid() = profile_id);
drop policy if exists "body_metrics: owner can insert" on public.body_metrics;
create policy "body_metrics: owner can insert"
  on public.body_metrics for insert with check (auth.uid() = profile_id);
drop policy if exists "body_metrics: owner can update" on public.body_metrics;
create policy "body_metrics: owner can update"
  on public.body_metrics for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "body_metrics: owner can delete" on public.body_metrics;
create policy "body_metrics: owner can delete"
  on public.body_metrics for delete using (auth.uid() = profile_id);

-- 7-weigh-in moving-average trend view.
-- Uses a single-table window over the user's own rows — no self-join or GROUP BY.
create or replace view public.body_weight_trend with (security_invoker = true) as
select
  profile_id,
  measured_on,
  weight_kg,
  avg(weight_kg) over (
    partition by profile_id
    order by measured_on
    rows between 6 preceding and current row
  ) as trend_7_kg
from public.body_metrics
where weight_kg is not null;

-- ---------------------------------------------------------------------------
-- progress_photos — metadata only; the actual WebP file lives in Storage
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.photo_kind_enum as enum ('body', 'face');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.photo_view_enum as enum ('front', 'side', 'back', 'profile');
exception when duplicate_object then null; end $$;

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  taken_on date not null,
  kind public.photo_kind_enum not null,
  view public.photo_view_enum not null,
  -- Storage path inside the `progress-photos` bucket:
  -- `{profile_id}/{YYYY-MM-DD}/{kind}-{view}.webp`
  storage_path text not null,
  width_px integer,
  height_px integer,
  bytes integer,
  created_at timestamptz not null default now(),
  unique (profile_id, taken_on, kind, view)
);

create index if not exists progress_photos_profile_date_idx
  on public.progress_photos (profile_id, taken_on desc);

alter table public.progress_photos enable row level security;

drop policy if exists "progress_photos: owner can select" on public.progress_photos;
create policy "progress_photos: owner can select"
  on public.progress_photos for select using (auth.uid() = profile_id);
drop policy if exists "progress_photos: owner can insert" on public.progress_photos;
create policy "progress_photos: owner can insert"
  on public.progress_photos for insert with check (auth.uid() = profile_id);
drop policy if exists "progress_photos: owner can update" on public.progress_photos;
create policy "progress_photos: owner can update"
  on public.progress_photos for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "progress_photos: owner can delete" on public.progress_photos;
create policy "progress_photos: owner can delete"
  on public.progress_photos for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Storage bucket: progress-photos (private, signed URLs only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('progress-photos', 'progress-photos', false)
  on conflict (id) do update set public = excluded.public;

-- Storage policies — owner-folder-only access
drop policy if exists "progress-photos: owner can read" on storage.objects;
create policy "progress-photos: owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "progress-photos: owner can insert" on storage.objects;
create policy "progress-photos: owner can insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "progress-photos: owner can update" on storage.objects;
create policy "progress-photos: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "progress-photos: owner can delete" on storage.objects;
create policy "progress-photos: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
