-- ============================================================================
-- FitForge90 — initial schema (M1 Foundations)
-- Every table in public has RLS enabled in the same migration that creates it.
-- See docs/build/security.md for the policy template.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
-- Note: `citext` skipped — on some Supabase self-hosted setups the `postgres`
-- role lacks permission to create base types. We use `text` + a lowercase
-- unique index instead, which gives the same case-insensitive uniqueness.

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.sex_enum as enum ('male', 'female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.experience_enum as enum ('beginner', 'returner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_level_enum as enum (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.phase_enum as enum ('foundation', 'build', 'reveal', 'peak');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_type_enum as enum ('strength', 'conditioning', 'hybrid', 'rest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_category_enum as enum (
    'push', 'pull', 'squat', 'hinge', 'carry', 'core',
    'conditioning', 'mobility', 'warmup'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.difficulty_enum as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  sex public.sex_enum,
  age smallint check (age between 14 and 120),
  height_cm numeric(5, 1) check (height_cm > 0 and height_cm <= 260),
  weight_kg numeric(5, 2) check (weight_kg > 0 and weight_kg <= 400),
  experience public.experience_enum,
  activity_level public.activity_level_enum default 'moderate',
  cardio_baseline_minutes_at_6kmh integer check (cardio_baseline_minutes_at_6kmh >= 0),
  sessions_per_week smallint check (sessions_per_week between 1 and 7),
  session_duration_minutes smallint check (session_duration_minutes between 15 and 240),
  training_time text check (training_time in ('morning_fasted', 'midday', 'evening')),
  timezone text not null default 'Africa/Lagos',
  goals text[] not null default '{}',
  bmi numeric generated always as (
    case
      when height_cm is null or height_cm = 0 then null
      else round((weight_kg / ((height_cm / 100) ^ 2))::numeric, 2)
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles: owner can select" on public.profiles;
create policy "profiles: owner can select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: owner can insert" on public.profiles;
create policy "profiles: owner can insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile when an auth user is inserted.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- exercises (reference data — seeded via service role)
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category public.exercise_category_enum not null,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty public.difficulty_enum not null,
  gif_url text,

  posture_cues text[] not null default '{}',
  benefits jsonb not null default '{}'::jsonb,
  movement_steps jsonb not null default '[]'::jsonb,
  safety_warnings text[] not null default '{}',
  contraindications text[] not null default '{}',
  body_changes_to_watch jsonb not null default '{}'::jsonb,
  common_mistakes jsonb not null default '[]'::jsonb,
  progression_slug text,
  regression_slug text,

  default_sets_min smallint,
  default_sets_max smallint,
  default_reps_min smallint,
  default_reps_max smallint,
  default_rest_seconds integer,
  tempo text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_category_idx on public.exercises (category);
create index if not exists exercises_slug_idx on public.exercises (slug);

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

drop policy if exists "exercises: authenticated can read" on public.exercises;
create policy "exercises: authenticated can read"
  on public.exercises for select
  to authenticated
  using (true);
-- Writes via service role only — no insert/update/delete policies.

-- ---------------------------------------------------------------------------
-- plans (one per profile)
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  generated_at timestamptz not null default now(),
  version integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, version)
);

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

drop policy if exists "plans: owner can select" on public.plans;
create policy "plans: owner can select"
  on public.plans for select using (auth.uid() = profile_id);
drop policy if exists "plans: owner can insert" on public.plans;
create policy "plans: owner can insert"
  on public.plans for insert with check (auth.uid() = profile_id);
drop policy if exists "plans: owner can update" on public.plans;
create policy "plans: owner can update"
  on public.plans for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "plans: owner can delete" on public.plans;
create policy "plans: owner can delete"
  on public.plans for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- phases
-- ---------------------------------------------------------------------------
create table if not exists public.phases (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  number smallint not null check (number between 1 and 4),
  name public.phase_enum not null,
  created_at timestamptz not null default now(),
  unique (plan_id, number)
);

create index if not exists phases_plan_idx on public.phases (plan_id);

alter table public.phases enable row level security;

drop policy if exists "phases: owner can select" on public.phases;
create policy "phases: owner can select"
  on public.phases for select using (auth.uid() = profile_id);
drop policy if exists "phases: owner can insert" on public.phases;
create policy "phases: owner can insert"
  on public.phases for insert with check (auth.uid() = profile_id);
drop policy if exists "phases: owner can update" on public.phases;
create policy "phases: owner can update"
  on public.phases for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "phases: owner can delete" on public.phases;
create policy "phases: owner can delete"
  on public.phases for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- weeks
-- ---------------------------------------------------------------------------
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  number smallint not null check (number between 1 and 13),
  is_deload boolean not null default false,
  target_kcal integer not null check (target_kcal >= 1200 and target_kcal <= 6000),
  protein_g integer not null check (protein_g >= 0),
  carbs_g integer not null check (carbs_g >= 0),
  fat_g integer not null check (fat_g >= 0),
  created_at timestamptz not null default now(),
  unique (plan_id, number)
);

create index if not exists weeks_plan_idx on public.weeks (plan_id);
create index if not exists weeks_phase_idx on public.weeks (phase_id);

alter table public.weeks enable row level security;

drop policy if exists "weeks: owner can select" on public.weeks;
create policy "weeks: owner can select"
  on public.weeks for select using (auth.uid() = profile_id);
drop policy if exists "weeks: owner can insert" on public.weeks;
create policy "weeks: owner can insert"
  on public.weeks for insert with check (auth.uid() = profile_id);
drop policy if exists "weeks: owner can update" on public.weeks;
create policy "weeks: owner can update"
  on public.weeks for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "weeks: owner can delete" on public.weeks;
create policy "weeks: owner can delete"
  on public.weeks for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- sessions (one row per calendar day, 90 total per plan — rest days included)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 90),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  type public.session_type_enum not null,
  name text not null,
  session_date date not null,
  cardio jsonb,
  warmup jsonb,
  mobility_block jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, day_number)
);

create index if not exists sessions_profile_date_idx on public.sessions (profile_id, session_date);
create index if not exists sessions_plan_day_idx on public.sessions (plan_id, day_number);

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

alter table public.sessions enable row level security;

drop policy if exists "sessions: owner can select" on public.sessions;
create policy "sessions: owner can select"
  on public.sessions for select using (auth.uid() = profile_id);
drop policy if exists "sessions: owner can insert" on public.sessions;
create policy "sessions: owner can insert"
  on public.sessions for insert with check (auth.uid() = profile_id);
drop policy if exists "sessions: owner can update" on public.sessions;
create policy "sessions: owner can update"
  on public.sessions for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "sessions: owner can delete" on public.sessions;
create policy "sessions: owner can delete"
  on public.sessions for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- session_exercises (ordered list of exercises within a session)
-- ---------------------------------------------------------------------------
create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  exercise_slug text not null references public.exercises(slug) on delete restrict on update cascade,
  ord smallint not null check (ord >= 0),
  target_sets smallint not null check (target_sets > 0),
  target_reps_min smallint not null check (target_reps_min > 0),
  target_reps_max smallint not null check (target_reps_max >= target_reps_min),
  target_load_kg numeric(6, 2),
  rest_seconds integer not null default 90,
  tempo text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, ord)
);

create index if not exists session_exercises_session_idx on public.session_exercises (session_id);
create index if not exists session_exercises_exercise_idx on public.session_exercises (exercise_slug);

drop trigger if exists session_exercises_set_updated_at on public.session_exercises;
create trigger session_exercises_set_updated_at
  before update on public.session_exercises
  for each row execute function public.set_updated_at();

alter table public.session_exercises enable row level security;

drop policy if exists "session_exercises: owner can select" on public.session_exercises;
create policy "session_exercises: owner can select"
  on public.session_exercises for select using (auth.uid() = profile_id);
drop policy if exists "session_exercises: owner can insert" on public.session_exercises;
create policy "session_exercises: owner can insert"
  on public.session_exercises for insert with check (auth.uid() = profile_id);
drop policy if exists "session_exercises: owner can update" on public.session_exercises;
create policy "session_exercises: owner can update"
  on public.session_exercises for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "session_exercises: owner can delete" on public.session_exercises;
create policy "session_exercises: owner can delete"
  on public.session_exercises for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- foods (reference table — Nigerian + global staples, seeded via service role)
-- ---------------------------------------------------------------------------
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('nigerian', 'global', 'supplement', 'restaurant')),
  tags text[] not null default '{}',

  kcal_per_100g numeric not null check (kcal_per_100g >= 0),
  protein_per_100g numeric not null check (protein_per_100g >= 0),
  carbs_per_100g numeric not null check (carbs_per_100g >= 0),
  fat_per_100g numeric not null check (fat_per_100g >= 0),
  fiber_per_100g numeric not null default 0 check (fiber_per_100g >= 0),

  default_serving_g numeric not null check (default_serving_g > 0),
  default_serving_label text not null,

  is_custom boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists foods_tags_idx on public.foods using gin (tags);
create index if not exists foods_name_tsv_idx on public.foods using gin (to_tsvector('english', name));
create index if not exists foods_category_idx on public.foods (category);

alter table public.foods enable row level security;

-- Authenticated users can read all non-custom foods, plus their own custom foods.
drop policy if exists "foods: authenticated can read curated" on public.foods;
create policy "foods: authenticated can read curated"
  on public.foods for select
  to authenticated
  using (is_custom = false or created_by = auth.uid());

drop policy if exists "foods: owner can create custom" on public.foods;
create policy "foods: owner can create custom"
  on public.foods for insert
  to authenticated
  with check (is_custom = true and created_by = auth.uid());

drop policy if exists "foods: owner can update custom" on public.foods;
create policy "foods: owner can update custom"
  on public.foods for update
  to authenticated
  using (is_custom = true and created_by = auth.uid())
  with check (is_custom = true and created_by = auth.uid());

drop policy if exists "foods: owner can delete custom" on public.foods;
create policy "foods: owner can delete custom"
  on public.foods for delete
  to authenticated
  using (is_custom = true and created_by = auth.uid());

commit;
