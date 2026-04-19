-- ============================================================================
-- 0003 — Nutrition + Water + Daily Check-ins (M4)
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- daily_checkins — one row per (profile, date). 15-second morning form.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  check_date date not null,
  sleep_hours numeric(3, 1) check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 20)),
  energy smallint check (energy is null or (energy between 1 and 5)),
  soreness smallint check (soreness is null or (soreness between 1 and 5)),
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, check_date)
);

create index if not exists daily_checkins_profile_date_idx
  on public.daily_checkins (profile_id, check_date desc);

drop trigger if exists daily_checkins_set_updated_at on public.daily_checkins;
create trigger daily_checkins_set_updated_at
  before update on public.daily_checkins
  for each row execute function public.set_updated_at();

alter table public.daily_checkins enable row level security;

drop policy if exists "daily_checkins: owner can select" on public.daily_checkins;
create policy "daily_checkins: owner can select"
  on public.daily_checkins for select using (auth.uid() = profile_id);
drop policy if exists "daily_checkins: owner can insert" on public.daily_checkins;
create policy "daily_checkins: owner can insert"
  on public.daily_checkins for insert with check (auth.uid() = profile_id);
drop policy if exists "daily_checkins: owner can update" on public.daily_checkins;
create policy "daily_checkins: owner can update"
  on public.daily_checkins for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "daily_checkins: owner can delete" on public.daily_checkins;
create policy "daily_checkins: owner can delete"
  on public.daily_checkins for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- water_logs — each tap is one row. 04:00 Lagos day-boundary is enforced
-- in the query layer (see src/lib/dates/lagos.ts + nutrition Server Actions).
-- ---------------------------------------------------------------------------
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount_ml integer not null check (amount_ml between 1 and 5000),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists water_logs_profile_time_idx
  on public.water_logs (profile_id, logged_at desc);

alter table public.water_logs enable row level security;

drop policy if exists "water_logs: owner can select" on public.water_logs;
create policy "water_logs: owner can select"
  on public.water_logs for select using (auth.uid() = profile_id);
drop policy if exists "water_logs: owner can insert" on public.water_logs;
create policy "water_logs: owner can insert"
  on public.water_logs for insert with check (auth.uid() = profile_id);
drop policy if exists "water_logs: owner can delete" on public.water_logs;
create policy "water_logs: owner can delete"
  on public.water_logs for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- nutrition_entries — one row per food logged to a meal
-- ---------------------------------------------------------------------------
create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  servings_g numeric(8, 2) not null check (servings_g > 0 and servings_g <= 5000),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_entries_profile_time_idx
  on public.nutrition_entries (profile_id, logged_at desc);
create index if not exists nutrition_entries_profile_meal_idx
  on public.nutrition_entries (profile_id, meal_type, logged_at);

alter table public.nutrition_entries enable row level security;

drop policy if exists "nutrition_entries: owner can select" on public.nutrition_entries;
create policy "nutrition_entries: owner can select"
  on public.nutrition_entries for select using (auth.uid() = profile_id);
drop policy if exists "nutrition_entries: owner can insert" on public.nutrition_entries;
create policy "nutrition_entries: owner can insert"
  on public.nutrition_entries for insert with check (auth.uid() = profile_id);
drop policy if exists "nutrition_entries: owner can update" on public.nutrition_entries;
create policy "nutrition_entries: owner can update"
  on public.nutrition_entries for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "nutrition_entries: owner can delete" on public.nutrition_entries;
create policy "nutrition_entries: owner can delete"
  on public.nutrition_entries for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Derived macros view — computed on read, no duplication
-- ---------------------------------------------------------------------------
create or replace view public.nutrition_entries_with_macros with (security_invoker = true) as
select
  ne.id,
  ne.profile_id,
  ne.food_id,
  ne.meal_type,
  ne.servings_g,
  ne.logged_at,
  ne.notes,
  f.slug as food_slug,
  f.name as food_name,
  round((f.kcal_per_100g * ne.servings_g / 100.0)::numeric, 1) as kcal,
  round((f.protein_per_100g * ne.servings_g / 100.0)::numeric, 1) as protein_g,
  round((f.carbs_per_100g * ne.servings_g / 100.0)::numeric, 1) as carbs_g,
  round((f.fat_per_100g * ne.servings_g / 100.0)::numeric, 1) as fat_g,
  round((f.fiber_per_100g * ne.servings_g / 100.0)::numeric, 1) as fiber_g
from public.nutrition_entries ne
join public.foods f on f.id = ne.food_id;

comment on view public.nutrition_entries_with_macros is
  'Derived kcal + macros per nutrition entry. security_invoker=true makes RLS apply under the caller, preserving per-user isolation.';

-- ---------------------------------------------------------------------------
-- user_saved_meals — named bundles of foods for one-tap repeats
-- ---------------------------------------------------------------------------
create table if not exists public.user_saved_meals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  default_meal_type text check (default_meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_saved_meals_profile_idx on public.user_saved_meals (profile_id);

drop trigger if exists user_saved_meals_set_updated_at on public.user_saved_meals;
create trigger user_saved_meals_set_updated_at
  before update on public.user_saved_meals
  for each row execute function public.set_updated_at();

alter table public.user_saved_meals enable row level security;

drop policy if exists "user_saved_meals: owner can select" on public.user_saved_meals;
create policy "user_saved_meals: owner can select"
  on public.user_saved_meals for select using (auth.uid() = profile_id);
drop policy if exists "user_saved_meals: owner can insert" on public.user_saved_meals;
create policy "user_saved_meals: owner can insert"
  on public.user_saved_meals for insert with check (auth.uid() = profile_id);
drop policy if exists "user_saved_meals: owner can update" on public.user_saved_meals;
create policy "user_saved_meals: owner can update"
  on public.user_saved_meals for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "user_saved_meals: owner can delete" on public.user_saved_meals;
create policy "user_saved_meals: owner can delete"
  on public.user_saved_meals for delete using (auth.uid() = profile_id);

create table if not exists public.user_saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.user_saved_meals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  servings_g numeric(8, 2) not null check (servings_g > 0 and servings_g <= 5000),
  ord smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists user_saved_meal_items_saved_idx on public.user_saved_meal_items (saved_meal_id);

alter table public.user_saved_meal_items enable row level security;

drop policy if exists "user_saved_meal_items: owner can select" on public.user_saved_meal_items;
create policy "user_saved_meal_items: owner can select"
  on public.user_saved_meal_items for select using (auth.uid() = profile_id);
drop policy if exists "user_saved_meal_items: owner can insert" on public.user_saved_meal_items;
create policy "user_saved_meal_items: owner can insert"
  on public.user_saved_meal_items for insert with check (auth.uid() = profile_id);
drop policy if exists "user_saved_meal_items: owner can update" on public.user_saved_meal_items;
create policy "user_saved_meal_items: owner can update"
  on public.user_saved_meal_items for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "user_saved_meal_items: owner can delete" on public.user_saved_meal_items;
create policy "user_saved_meal_items: owner can delete"
  on public.user_saved_meal_items for delete using (auth.uid() = profile_id);

commit;
