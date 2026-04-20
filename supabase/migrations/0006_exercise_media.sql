-- 0006 exercise_media
--
-- Replaces the M2-era placeholder Giphy URLs (which all resolved to a single
-- "this content is not available" fallback image) with real static exercise
-- photos from yuhonas/free-exercise-db (GitHub raw CDN, no auth needed).
--
-- 45/57 exercises get a matching photo. The other 12 (mostly mobility / warmup
-- primitives with no analog in the source DB) are set to NULL; the session-UI
-- already skips the <img> gracefully when gif_url is NULL, so no empty slots
-- will render.
--
-- Source: https://github.com/yuhonas/free-exercise-db  (license: public domain)
-- URL pattern: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<folder>/0.jpg

begin;

-- Tag media provenance so we can re-run this swap cleanly if we change sources.
create table if not exists public.exercise_media_sources (
  slug text primary key references public.exercises(slug) on delete cascade,
  source_name text not null,
  source_ref text,
  updated_at timestamptz not null default now()
);

with m(slug, folder) as (values
  -- push
  ('barbell-bench-press', 'Barbell_Bench_Press_-_Medium_Grip'),
  ('cable-triceps-pushdown', 'Triceps_Pushdown'),
  ('close-grip-bench-press', 'Close-Grip_Barbell_Bench_Press'),
  ('dips', 'Parallel_Bar_Dip'),
  ('incline-dumbbell-press', 'Incline_Dumbbell_Press'),
  ('lateral-raises', 'Side_Lateral_Raise'),
  ('overhead-press', 'Standing_Military_Press'),
  ('push-ups', 'Pushups'),
  ('seated-dumbbell-shoulder-press', 'Dumbbell_Shoulder_Press'),
  ('skull-crushers', 'EZ-Bar_Skullcrusher'),
  -- pull
  ('barbell-curl', 'Barbell_Curl'),
  ('barbell-row', 'Bent_Over_Barbell_Row'),
  ('chest-supported-row', 'Dumbbell_Incline_Row'),
  ('chin-ups', 'Chin-Up'),
  ('dumbbell-bicep-curl', 'Dumbbell_Bicep_Curl'),
  ('face-pull', 'Face_Pull'),
  ('lat-pulldown', 'Wide-Grip_Lat_Pulldown'),
  ('pull-ups', 'Pullups'),
  ('seated-cable-row', 'Seated_Cable_Rows'),
  ('single-arm-dumbbell-row', 'One-Arm_Dumbbell_Row'),
  -- squat
  ('barbell-back-squat', 'Barbell_Squat'),
  ('bulgarian-split-squat', 'Split_Squats'),
  ('front-squat', 'Front_Squat_Clean_Grip'),
  ('goblet-squat', 'Goblet_Squat'),
  ('pause-squat', 'Barbell_Squat'),
  -- hinge
  ('conventional-deadlift', 'Barbell_Deadlift'),
  ('hip-thrust', 'Barbell_Hip_Thrust'),
  ('kettlebell-swing', 'One-Arm_Kettlebell_Swings'),
  ('romanian-deadlift', 'Romanian_Deadlift'),
  ('trap-bar-deadlift', 'Trap_Bar_Deadlift'),
  -- carry
  ('farmers-carry', 'Farmers_Walk'),
  -- core
  ('ab-wheel-rollout', 'Barbell_Ab_Rollout'),
  ('cable-crunch', 'Cable_Crunch'),
  ('dead-bug', 'Dead_Bug'),
  ('hanging-knee-raise', 'Hanging_Leg_Raise'),
  ('hanging-leg-raise', 'Hanging_Leg_Raise'),
  ('pallof-press', 'Pallof_Press'),
  ('plank', 'Plank'),
  -- conditioning
  ('assault-bike-intervals', 'Air_Bike'),
  ('rowing-intervals', 'Rowing_Stationary'),
  ('treadmill-intervals', 'Running_Treadmill'),
  ('treadmill-steady-state', 'Jogging_Treadmill'),
  -- warmup
  ('band-pull-apart', 'Band_Pull_Apart'),
  ('cat-cow', 'Cat_Stretch'),
  ('glute-bridge', 'Barbell_Glute_Bridge'),
  ('worlds-greatest-stretch', 'Worlds_Greatest_Stretch')
)
update public.exercises e
set gif_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' || m.folder || '/0.jpg'
from m where e.slug = m.slug;

-- Record source attribution for the ones we mapped.
insert into public.exercise_media_sources (slug, source_name, source_ref)
select e.slug, 'yuhonas/free-exercise-db', split_part(regexp_replace(e.gif_url, '.*/exercises/', ''), '/', 1)
from public.exercises e
where e.gif_url like 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%'
on conflict (slug) do update
  set source_name = excluded.source_name, source_ref = excluded.source_ref, updated_at = now();

-- Exercises with no analog in the source DB: clear the broken placeholder
-- (the UI gracefully skips the <img> when gif_url is NULL).
update public.exercises
set gif_url = null
where slug in (
  'sled-push',
  'side-plank',
  'kettlebell-complex',
  'couch-stretch',
  'dead-hang',
  'neck-retraction',
  'pigeon-pose',
  'thoracic-rotation-quadruped',
  'wall-slides',
  'hip-90-90',
  'leg-swings',
  'scapular-push-ups'
);

-- Sanity check — fail the migration if we didn't cover every exercise either
-- with a new URL or an explicit NULL.
do $$
declare
  missed int;
begin
  select count(*) into missed from public.exercises
  where gif_url is not null
    and gif_url not like 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%';
  if missed > 0 then
    raise exception 'exercise_media: % rows still point at non-yuhonas URLs', missed;
  end if;
end $$;

commit;
