-- 0008 exercise_media_selfhost
--
-- Mirrors the 52 animated GIFs from 0007 into Supabase Storage (public bucket
-- `exercise-media`) and points gif_url at the self-hosted URLs, removing the
-- runtime dependency on fitnessprogramer.com.
--
-- Storage pre-work (done out-of-band before applying this migration):
--  1. Bucket `exercise-media` created (public, image/* mime allowlist).
--  2. 52 files uploaded via `POST /storage/v1/object/exercise-media/<slug>.<ext>`
--     with service-role bearer. See C:/tmp/mirror-media.mjs.
--
-- URL pattern: `${SUPABASE_URL}/storage/v1/object/public/exercise-media/<slug>.<ext>?apikey=<ANON>`
-- The `?apikey=` query param is required because self-hosted Kong enforces
-- apikey on all /storage routes (shared-infra constraint — removing the plugin
-- globally would affect 8 other projects on the VPS). The anon key is public
-- by design (baked into every client bundle), so hard-coding it here is safe.
-- If the anon key rotates, re-apply this migration with the new value.

begin;

with m(slug, url) as (values
  ('barbell-bench-press', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/barbell-bench-press.gif?apikey=__ANON__'),
  ('cable-triceps-pushdown', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/cable-triceps-pushdown.gif?apikey=__ANON__'),
  ('close-grip-bench-press', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/close-grip-bench-press.gif?apikey=__ANON__'),
  ('dips', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/dips.gif?apikey=__ANON__'),
  ('incline-dumbbell-press', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/incline-dumbbell-press.gif?apikey=__ANON__'),
  ('lateral-raises', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/lateral-raises.gif?apikey=__ANON__'),
  ('overhead-press', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/overhead-press.gif?apikey=__ANON__'),
  ('push-ups', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/push-ups.gif?apikey=__ANON__'),
  ('seated-dumbbell-shoulder-press', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/seated-dumbbell-shoulder-press.gif?apikey=__ANON__'),
  ('skull-crushers', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/skull-crushers.gif?apikey=__ANON__'),
  ('barbell-curl', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/barbell-curl.gif?apikey=__ANON__'),
  ('barbell-row', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/barbell-row.gif?apikey=__ANON__'),
  ('chest-supported-row', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/chest-supported-row.gif?apikey=__ANON__'),
  ('chin-ups', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/chin-ups.gif?apikey=__ANON__'),
  ('dumbbell-bicep-curl', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/dumbbell-bicep-curl.gif?apikey=__ANON__'),
  ('face-pull', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/face-pull.gif?apikey=__ANON__'),
  ('lat-pulldown', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/lat-pulldown.gif?apikey=__ANON__'),
  ('pull-ups', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/pull-ups.gif?apikey=__ANON__'),
  ('seated-cable-row', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/seated-cable-row.gif?apikey=__ANON__'),
  ('single-arm-dumbbell-row', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/single-arm-dumbbell-row.gif?apikey=__ANON__'),
  ('barbell-back-squat', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/barbell-back-squat.gif?apikey=__ANON__'),
  ('bulgarian-split-squat', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/bulgarian-split-squat.gif?apikey=__ANON__'),
  ('front-squat', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/front-squat.gif?apikey=__ANON__'),
  ('goblet-squat', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/goblet-squat.gif?apikey=__ANON__'),
  ('pause-squat', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/pause-squat.gif?apikey=__ANON__'),
  ('conventional-deadlift', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/conventional-deadlift.gif?apikey=__ANON__'),
  ('romanian-deadlift', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/romanian-deadlift.gif?apikey=__ANON__'),
  ('trap-bar-deadlift', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/trap-bar-deadlift.gif?apikey=__ANON__'),
  ('kettlebell-swing', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/kettlebell-swing.gif?apikey=__ANON__'),
  ('farmers-carry', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/farmers-carry.gif?apikey=__ANON__'),
  ('ab-wheel-rollout', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/ab-wheel-rollout.gif?apikey=__ANON__'),
  ('cable-crunch', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/cable-crunch.gif?apikey=__ANON__'),
  ('dead-bug', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/dead-bug.gif?apikey=__ANON__'),
  ('hanging-knee-raise', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/hanging-knee-raise.gif?apikey=__ANON__'),
  ('hanging-leg-raise', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/hanging-leg-raise.gif?apikey=__ANON__'),
  ('pallof-press', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/pallof-press.gif?apikey=__ANON__'),
  ('plank', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/plank.gif?apikey=__ANON__'),
  ('side-plank', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/side-plank.png?apikey=__ANON__'),
  ('assault-bike-intervals', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/assault-bike-intervals.gif?apikey=__ANON__'),
  ('rowing-intervals', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/rowing-intervals.gif?apikey=__ANON__'),
  ('treadmill-intervals', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/treadmill-intervals.gif?apikey=__ANON__'),
  ('treadmill-steady-state', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/treadmill-steady-state.gif?apikey=__ANON__'),
  ('couch-stretch', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/couch-stretch.gif?apikey=__ANON__'),
  ('dead-hang', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/dead-hang.png?apikey=__ANON__'),
  ('neck-retraction', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/neck-retraction.gif?apikey=__ANON__'),
  ('wall-slides', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/wall-slides.gif?apikey=__ANON__'),
  ('band-pull-apart', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/band-pull-apart.gif?apikey=__ANON__'),
  ('cat-cow', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/cat-cow.gif?apikey=__ANON__'),
  ('glute-bridge', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/glute-bridge.gif?apikey=__ANON__'),
  ('hip-90-90', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/hip-90-90.gif?apikey=__ANON__'),
  ('leg-swings', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/leg-swings.gif?apikey=__ANON__'),
  ('scapular-push-ups', 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/scapular-push-ups.gif?apikey=__ANON__')
)
update public.exercises e
set gif_url = m.url
from m
where e.slug = m.slug;

-- Update provenance
update public.exercise_media_sources
set source_name = 'self-hosted (Supabase Storage: exercise-media)',
    source_ref = regexp_replace(
      (select gif_url from public.exercises where slug = exercise_media_sources.slug),
      '^.*/exercise-media/', ''
    ),
    updated_at = now()
where slug in (select slug from public.exercises where gif_url like '%exercise-media/%');

-- Sanity: every non-null URL is now pointing at our Supabase Storage.
do $$
declare wrong int;
begin
  select count(*) into wrong from public.exercises
  where gif_url is not null and gif_url not like 'https://supabase.operscale.cloud/storage/v1/object/public/exercise-media/%';
  if wrong > 0 then
    raise exception 'exercise_media_selfhost: % rows still on external CDN', wrong;
  end if;
end $$;

commit;
