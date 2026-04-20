-- 0007 exercise_media_animated
--
-- Replaces the static photos from migration 0006 (yuhonas/free-exercise-db) with
-- animated GIFs from fitnessprogramer.com. Source map is azilRababe/Exercises_Dataset
-- (1411 curated entries, Apache 2.0).
--
-- 52/58 exercises get a real animated demonstration GIF. 6 have no analog and
-- resolve to NULL (session UI gracefully skips the <img> when null).
--
-- Caveats:
--  - fitnessprogramer.com is a commercial site; hotlinking is not formally sanctioned.
--    If they restrict or rotate URLs, we'll need to mirror into Supabase Storage.
--    Tracked as deferred: "M7+ mirror exercise media into Supabase Storage bucket".
--  - `side-plank` and `dead-hang` resolve to .png (static) entries on their end —
--    both are isometric holds, so no animation needed.
--
-- Source: https://github.com/azilRababe/Exercises_Dataset (gifs.json)
-- Live verify: `curl -I <url>` should return 200 with Content-Type: image/gif

begin;

with m(slug, url) as (values
  ('barbell-bench-press', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif'),
  ('cable-triceps-pushdown', 'https://fitnessprogramer.com/wp-content/uploads/2022/11/One-arm-triceps-pushdown.gif'),
  ('close-grip-bench-press', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Close-Grip-Bench-Press.gif'),
  ('dips', 'https://fitnessprogramer.com/wp-content/uploads/2022/04/parallel-bar-dip.gif'),
  ('incline-dumbbell-press', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif'),
  ('lateral-raises', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif'),
  ('overhead-press', 'https://fitnessprogramer.com/wp-content/uploads/2021/07/Barbell-Standing-Military-Press.gif'),
  ('push-ups', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif'),
  ('seated-dumbbell-shoulder-press', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif'),
  ('skull-crushers', 'https://fitnessprogramer.com/wp-content/uploads/2022/02/Bodyweight-Skull-Crushers.gif'),
  ('barbell-curl', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif'),
  ('barbell-row', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif'),
  ('chest-supported-row', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif'),
  ('chin-ups', 'https://fitnessprogramer.com/wp-content/uploads/2021/03/Chin-Up.gif'),
  ('dumbbell-bicep-curl', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif'),
  ('face-pull', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif'),
  ('lat-pulldown', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif'),
  ('pull-ups', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif'),
  ('seated-cable-row', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif'),
  ('single-arm-dumbbell-row', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif'),
  ('barbell-back-squat', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif'),
  ('bulgarian-split-squat', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Barbell-Bulgarian-Split-Squat.gif'),
  ('front-squat', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/front-squat.gif'),
  ('goblet-squat', 'https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif'),
  ('pause-squat', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif'),
  ('conventional-deadlift', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif'),
  ('romanian-deadlift', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif'),
  ('trap-bar-deadlift', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Trap-Bar-Deadlift.gif'),
  ('kettlebell-swing', 'https://fitnessprogramer.com/wp-content/uploads/2021/09/Kettlebell-Swings.gif'),
  ('farmers-carry', 'https://fitnessprogramer.com/wp-content/uploads/2022/02/Farmers-walk_Cardio.gif'),
  ('ab-wheel-rollout', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Ab-Wheel-Rollout.gif'),
  ('cable-crunch', 'https://fitnessprogramer.com/wp-content/uploads/2021/09/Standing-Cable-Crunch.gif'),
  ('dead-bug', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dead-Bug.gif'),
  ('hanging-knee-raise', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hanging-Knee-Raises.gif'),
  ('hanging-leg-raise', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hanging-Knee-Raises.gif'),
  ('pallof-press', 'https://fitnessprogramer.com/wp-content/uploads/2022/02/Cable-Half-Kneeling-Pallof-Press.gif'),
  ('plank', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif'),
  ('side-plank', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Side-Plank-1-360x360.png'),
  ('assault-bike-intervals', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Bike.gif'),
  ('rowing-intervals', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Rowing-Machine.gif'),
  ('treadmill-intervals', 'https://fitnessprogramer.com/wp-content/uploads/2021/07/Run.gif'),
  ('treadmill-steady-state', 'https://fitnessprogramer.com/wp-content/uploads/2021/09/Walking.gif'),
  ('couch-stretch', 'https://fitnessprogramer.com/wp-content/uploads/2021/08/Kneeling-Hip-Flexor-Stretch.gif'),
  ('dead-hang', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/dead-hang-360x360.png'),
  ('neck-retraction', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Chin-Tuck.gif'),
  ('wall-slides', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/wall-slide.gif'),
  ('band-pull-apart', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Band-pull-apart.gif'),
  ('cat-cow', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/cat-cow.gif'),
  ('glute-bridge', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif'),
  ('hip-90-90', 'https://fitnessprogramer.com/wp-content/uploads/2022/08/90-90-Hip-Stretch.gif'),
  ('leg-swings', 'https://fitnessprogramer.com/wp-content/uploads/2023/06/Lateral-Leg-Swings.gif'),
  ('scapular-push-ups', 'https://fitnessprogramer.com/wp-content/uploads/2021/10/Scapular-Protraction-and-Retraction.gif')
)
update public.exercises e
set gif_url = m.url
from m
where e.slug = m.slug;

-- Slugs with no analog: ensure they stay NULL (they were already null from 0006,
-- but spell it out here so running 0007 standalone lands in the same state).
update public.exercises
set gif_url = null
where slug in (
  'hip-thrust',            -- only has Single-Leg-Hip-Thrust-Jump
  'sled-push',             -- no sled push
  'kettlebell-complex',    -- no complex/flow
  'pigeon-pose',           -- no pigeon
  'thoracic-rotation-quadruped',  -- only standing rotation
  'worlds-greatest-stretch'       -- no WGS
);

-- Update provenance table to reflect the new source.
update public.exercise_media_sources
set source_name = 'azilRababe/Exercises_Dataset (fitnessprogramer.com)',
    source_ref = regexp_replace((select gif_url from public.exercises where slug = exercise_media_sources.slug), '.*/uploads/', ''),
    updated_at = now()
where slug in (select slug from public.exercises where gif_url like '%fitnessprogramer.com%');

insert into public.exercise_media_sources (slug, source_name, source_ref)
select e.slug, 'azilRababe/Exercises_Dataset (fitnessprogramer.com)',
       regexp_replace(e.gif_url, '.*/uploads/', '')
from public.exercises e
where e.gif_url like '%fitnessprogramer.com%'
  and not exists (select 1 from public.exercise_media_sources s where s.slug = e.slug);

-- Sanity: every non-null URL must now be fitnessprogramer.com.
do $$
declare
  wrong int;
begin
  select count(*) into wrong from public.exercises
  where gif_url is not null
    and gif_url not like 'https://fitnessprogramer.com/%';
  if wrong > 0 then
    raise exception 'exercise_media_animated: % rows still point at the old source', wrong;
  end if;
end $$;

commit;
