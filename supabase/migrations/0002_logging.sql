-- ============================================================================
-- 0002 — Logging tables (M3)
-- session_logs / set_logs / cardio_logs / pain_notes / session_reflections
-- RLS enabled on every new table in this same migration.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Session state flags on sessions — red-flag interrupt lives here so the
-- adaptation engine + UI can read it atomically with the session record.
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists red_flag_volume_cap numeric(3, 2),
  add column if not exists red_flag_reason text;

comment on column public.sessions.red_flag_volume_cap is
  'If set, multiplier to apply to planned volume (e.g. 0.70 = cap at 70% of prescribed volume).';

-- ---------------------------------------------------------------------------
-- session_logs — one row per started session
-- ---------------------------------------------------------------------------
create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  overall_rpe smallint check (overall_rpe between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create index if not exists session_logs_profile_idx on public.session_logs (profile_id);

drop trigger if exists session_logs_set_updated_at on public.session_logs;
create trigger session_logs_set_updated_at
  before update on public.session_logs
  for each row execute function public.set_updated_at();

alter table public.session_logs enable row level security;

drop policy if exists "session_logs: owner can select" on public.session_logs;
create policy "session_logs: owner can select"
  on public.session_logs for select using (auth.uid() = profile_id);
drop policy if exists "session_logs: owner can insert" on public.session_logs;
create policy "session_logs: owner can insert"
  on public.session_logs for insert with check (auth.uid() = profile_id);
drop policy if exists "session_logs: owner can update" on public.session_logs;
create policy "session_logs: owner can update"
  on public.session_logs for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "session_logs: owner can delete" on public.session_logs;
create policy "session_logs: owner can delete"
  on public.session_logs for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- set_logs — one row per logged set of an exercise
-- ---------------------------------------------------------------------------
create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 30),
  weight_kg numeric(6, 2) check (weight_kg >= 0 and weight_kg <= 500),
  reps smallint not null check (reps between 0 and 200),
  rpe smallint check (rpe between 1 and 10),
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);

create index if not exists set_logs_profile_idx on public.set_logs (profile_id);
create index if not exists set_logs_session_idx on public.set_logs (session_id);
create index if not exists set_logs_session_exercise_idx on public.set_logs (session_exercise_id);

alter table public.set_logs enable row level security;

drop policy if exists "set_logs: owner can select" on public.set_logs;
create policy "set_logs: owner can select"
  on public.set_logs for select using (auth.uid() = profile_id);
drop policy if exists "set_logs: owner can insert" on public.set_logs;
create policy "set_logs: owner can insert"
  on public.set_logs for insert with check (auth.uid() = profile_id);
drop policy if exists "set_logs: owner can update" on public.set_logs;
create policy "set_logs: owner can update"
  on public.set_logs for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "set_logs: owner can delete" on public.set_logs;
create policy "set_logs: owner can delete"
  on public.set_logs for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- cardio_logs
-- ---------------------------------------------------------------------------
create table if not exists public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  modality text not null check (modality in (
    'treadmill', 'bike', 'rower', 'sled', 'assault_bike', 'outdoor_walk', 'outdoor_run'
  )),
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 14400),
  distance_m numeric(10, 2) check (distance_m is null or distance_m >= 0),
  avg_hr smallint check (avg_hr is null or avg_hr between 40 and 230),
  rpe smallint not null check (rpe between 1 and 10),
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists cardio_logs_profile_idx on public.cardio_logs (profile_id);
create index if not exists cardio_logs_session_idx on public.cardio_logs (session_id);

alter table public.cardio_logs enable row level security;

drop policy if exists "cardio_logs: owner can select" on public.cardio_logs;
create policy "cardio_logs: owner can select"
  on public.cardio_logs for select using (auth.uid() = profile_id);
drop policy if exists "cardio_logs: owner can insert" on public.cardio_logs;
create policy "cardio_logs: owner can insert"
  on public.cardio_logs for insert with check (auth.uid() = profile_id);
drop policy if exists "cardio_logs: owner can update" on public.cardio_logs;
create policy "cardio_logs: owner can update"
  on public.cardio_logs for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "cardio_logs: owner can delete" on public.cardio_logs;
create policy "cardio_logs: owner can delete"
  on public.cardio_logs for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- pain_notes — red-flag interrupt source
-- ---------------------------------------------------------------------------
create table if not exists public.pain_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  session_exercise_id uuid references public.session_exercises(id) on delete set null,
  location text not null check (length(location) between 1 and 80),
  severity smallint not null check (severity between 1 and 10),
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists pain_notes_profile_idx on public.pain_notes (profile_id);
create index if not exists pain_notes_session_idx on public.pain_notes (session_id);
create index if not exists pain_notes_severity_idx on public.pain_notes (severity) where severity >= 6;

alter table public.pain_notes enable row level security;

drop policy if exists "pain_notes: owner can select" on public.pain_notes;
create policy "pain_notes: owner can select"
  on public.pain_notes for select using (auth.uid() = profile_id);
drop policy if exists "pain_notes: owner can insert" on public.pain_notes;
create policy "pain_notes: owner can insert"
  on public.pain_notes for insert with check (auth.uid() = profile_id);
drop policy if exists "pain_notes: owner can update" on public.pain_notes;
create policy "pain_notes: owner can update"
  on public.pain_notes for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "pain_notes: owner can delete" on public.pain_notes;
create policy "pain_notes: owner can delete"
  on public.pain_notes for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Red-flag interrupt trigger: when a pain_note with severity >= 6 is
-- inserted, stamp the *next* scheduled session (day_number > logged session
-- day) with red_flag_volume_cap = 0.70 and a reasoning string.
-- ---------------------------------------------------------------------------
create or replace function public.flag_next_session_from_pain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_day smallint;
  current_plan_id uuid;
  affected_exercise text;
begin
  if new.severity < 6 then
    return new;
  end if;

  -- Find the day number of the source session (if provided)
  if new.session_id is not null then
    select day_number, plan_id into current_day, current_plan_id
    from public.sessions
    where id = new.session_id;
  end if;

  if new.session_exercise_id is not null then
    select exercise_slug into affected_exercise
    from public.session_exercises
    where id = new.session_exercise_id;
  end if;

  if current_plan_id is null then
    return new;
  end if;

  update public.sessions
  set red_flag_volume_cap = 0.70,
      red_flag_reason = concat(
        'Pain flagged (severity ', new.severity, ', ', new.location,
        coalesce(concat(', exercise: ', affected_exercise), ''),
        '). Volume capped at 70% until cleared.'
      )
  where plan_id = current_plan_id
    and day_number > coalesce(current_day, 0)
    and red_flag_volume_cap is null
    and day_number = (
      select min(day_number) from public.sessions
      where plan_id = current_plan_id and day_number > coalesce(current_day, 0)
    );

  return new;
end;
$$;

drop trigger if exists pain_notes_flag_next_session on public.pain_notes;
create trigger pain_notes_flag_next_session
  after insert on public.pain_notes
  for each row execute function public.flag_next_session_from_pain();

commit;
