/**
 * Exercise library seed — M2 (media self-hosted in Supabase Storage, migration 0008).
 *
 * Every exercise referenced by a phase template lives here with the full
 * educational + safety schema. Content is deliberate and reviewed — users
 * read the posture cues and safety warnings during live lifting sessions.
 *
 * Schema: see src/domain/exercise.ts.
 * Spec:   docs/specs/exercise-library-spec.md.
 *
 * Media: slugs map to files in the Supabase Storage `exercise-media` public
 * bucket (self-hosted, not a third-party CDN). Filename is `<slug>.{gif|png}`.
 * The public URL is assembled at seed time from env vars so the anon key
 * isn't hard-coded in source. 6 exercises have no analog in our source
 * catalog and resolve to null — the session UI gracefully skips the <img>.
 *
 * Source of truth for the mapping is MEDIA_FILES below AND the `exercises`
 * table gif_url column (migrations 0006 + 0007 + 0008). Keep them in sync
 * when adding exercises.
 *
 * To re-seed: ensure SUPABASE_URL + SUPABASE_ANON_KEY are set in env.
 */
import type { Exercise } from '@/domain/exercise'

// Filename in the `exercise-media` Supabase Storage bucket.
// null means this exercise has no demo media — UI hides the image slot.
const MEDIA_FILES: Record<string, string | null> = {
  // push
  'barbell-bench-press': 'barbell-bench-press.gif',
  'cable-triceps-pushdown': 'cable-triceps-pushdown.gif',
  'close-grip-bench-press': 'close-grip-bench-press.gif',
  dips: 'dips.gif',
  'incline-dumbbell-press': 'incline-dumbbell-press.gif',
  'lateral-raises': 'lateral-raises.gif',
  'overhead-press': 'overhead-press.gif',
  'push-ups': 'push-ups.gif',
  'seated-dumbbell-shoulder-press': 'seated-dumbbell-shoulder-press.gif',
  'skull-crushers': 'skull-crushers.gif',
  // pull
  'barbell-curl': 'barbell-curl.gif',
  'barbell-row': 'barbell-row.gif',
  'chest-supported-row': 'chest-supported-row.gif',
  'chin-ups': 'chin-ups.gif',
  'dumbbell-bicep-curl': 'dumbbell-bicep-curl.gif',
  'face-pull': 'face-pull.gif',
  'lat-pulldown': 'lat-pulldown.gif',
  'pull-ups': 'pull-ups.gif',
  'seated-cable-row': 'seated-cable-row.gif',
  'single-arm-dumbbell-row': 'single-arm-dumbbell-row.gif',
  // squat
  'barbell-back-squat': 'barbell-back-squat.gif',
  'bulgarian-split-squat': 'bulgarian-split-squat.gif',
  'front-squat': 'front-squat.gif',
  'goblet-squat': 'goblet-squat.gif',
  'pause-squat': 'pause-squat.gif',
  // hinge
  'conventional-deadlift': 'conventional-deadlift.gif',
  'hip-thrust': null,
  'kettlebell-swing': 'kettlebell-swing.gif',
  'romanian-deadlift': 'romanian-deadlift.gif',
  'trap-bar-deadlift': 'trap-bar-deadlift.gif',
  // carry
  'farmers-carry': 'farmers-carry.gif',
  'sled-push': null,
  // core
  'ab-wheel-rollout': 'ab-wheel-rollout.gif',
  'cable-crunch': 'cable-crunch.gif',
  'dead-bug': 'dead-bug.gif',
  'hanging-knee-raise': 'hanging-knee-raise.gif',
  'hanging-leg-raise': 'hanging-leg-raise.gif',
  'pallof-press': 'pallof-press.gif',
  plank: 'plank.gif',
  'side-plank': 'side-plank.png',
  // conditioning
  'assault-bike-intervals': 'assault-bike-intervals.gif',
  'kettlebell-complex': null,
  'rowing-intervals': 'rowing-intervals.gif',
  'treadmill-intervals': 'treadmill-intervals.gif',
  'treadmill-steady-state': 'treadmill-steady-state.gif',
  // mobility
  'couch-stretch': 'couch-stretch.gif',
  'dead-hang': 'dead-hang.png',
  'neck-retraction': 'neck-retraction.gif',
  'pigeon-pose': null,
  'thoracic-rotation-quadruped': null,
  'wall-slides': 'wall-slides.gif',
  // warmup
  'band-pull-apart': 'band-pull-apart.gif',
  'cat-cow': 'cat-cow.gif',
  'glute-bridge': 'glute-bridge.gif',
  'hip-90-90': 'hip-90-90.gif',
  'leg-swings': 'leg-swings.gif',
  'scapular-push-ups': 'scapular-push-ups.gif',
  'worlds-greatest-stretch': null,
}

const GIF = (slug: string): string | null => {
  if (!(slug in MEDIA_FILES)) {
    throw new Error(`exercises.ts: no media mapping for slug "${slug}" — update MEDIA_FILES`)
  }
  const file = MEDIA_FILES[slug]
  if (!file) return null
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anon) {
    throw new Error('exercises.ts: SUPABASE_URL + SUPABASE_ANON_KEY required to build media URLs')
  }
  return `${supabaseUrl}/storage/v1/object/public/exercise-media/${file}?apikey=${anon}`
}

// ---------------------------------------------------------------------------
// Warm-up primitives
// ---------------------------------------------------------------------------

const warmups: Exercise[] = [
  {
    slug: 'worlds-greatest-stretch',
    name: "World's Greatest Stretch",
    category: 'warmup',
    primary_muscles: ['hip flexors', 'thoracic spine'],
    secondary_muscles: ['hamstrings', 'adductors'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('worlds-greatest-stretch'),
    posture_cues: [
      'Long lunge — front knee stacked over ankle, back knee lifted',
      'Palm planted flat inside front foot',
      'Rotate open slowly — lead with the chest, eyes follow the hand',
      'Breathe out as you rotate; do not force the range',
    ],
    benefits: {
      physiological: [
        'Mobilises hip flexors, hamstrings, adductors, and thoracic spine in one pattern',
        'Raises core temperature and prepares the body for loaded work',
      ],
      aesthetic: [],
      functional: ['Carries over to every hinge and squat pattern', 'Improves overhead reach'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Step into a deep lunge, back knee lifted, hands beside the front foot.',
      },
      {
        phase: 'concentric',
        instruction:
          'Plant the opposite palm inside the front foot; rotate the other arm toward the ceiling.',
      },
      {
        phase: 'lockout',
        instruction: 'Hold the overhead rotation for 2 seconds, then return and switch sides.',
      },
    ],
    safety_warnings: [
      'Do not force rotation if you feel pinching in the low back — regress to a half-kneeling T-spine opener.',
    ],
    contraindications: ['Acute hip flexor strain'],
    body_changes_to_watch: {
      green_flags: [
        'Rotation range grows week to week',
        'Lifts feel easier to set up (upright chest in the squat)',
      ],
      red_flags: ['Sharp pinching in the front hip', 'Low-back cramping on rotation'],
    },
    common_mistakes: [
      {
        mistake: 'Front knee drifts inward',
        correction: 'Push the knee outward over the midline of the foot.',
      },
      {
        mistake: 'Yanking the arm up fast',
        correction: 'Rotate slow — 2 seconds up, 2 seconds back.',
      },
      {
        mistake: 'Back leg collapsed on the floor',
        correction: 'Keep the back knee lifted; it is a leg exercise too.',
      },
    ],
    progression: null,
    regression: null,
    default_sets: [1, 2],
    default_reps: [5, 8],
    default_rest_seconds: 20,
    tempo: null,
  },
  {
    slug: 'cat-cow',
    name: 'Cat-Cow',
    category: 'warmup',
    primary_muscles: ['spinal erectors', 'abdominals'],
    secondary_muscles: ['shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('cat-cow'),
    posture_cues: [
      'Quadruped — wrists under shoulders, knees under hips',
      'Initiate from the pelvis, not the neck',
      'Breathe in on the extension, out on the flexion',
    ],
    benefits: {
      physiological: ['Articulates the spine segmentally', 'Counteracts a seated workday'],
      aesthetic: [],
      functional: ['Teaches pelvic tilt awareness used in bracing under load'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Come to hands and knees — wrists under shoulders, knees under hips.',
      },
      {
        phase: 'eccentric',
        instruction: 'Inhale, drop the belly, lift the chest and tailbone (cow).',
      },
      {
        phase: 'concentric',
        instruction: 'Exhale, round the upper back, tuck the tailbone (cat).',
      },
    ],
    safety_warnings: ['Move through a comfortable range — avoid dumping into lumbar extension.'],
    contraindications: ['Acute disc issue in extension'],
    body_changes_to_watch: {
      green_flags: ['Spinal movement feels smoother and more segmented over time'],
      red_flags: ['Sharp shooting pain into the leg during extension'],
    },
    common_mistakes: [
      {
        mistake: 'Moving only the neck',
        correction: 'Lead with the pelvis; the neck should follow.',
      },
      { mistake: 'Rushing the reps', correction: 'Time to the breath — 3 seconds each phase.' },
      { mistake: 'Sagging wrists', correction: 'Spread fingers, press floor away.' },
    ],
    progression: null,
    regression: null,
    default_sets: [1, 2],
    default_reps: [6, 10],
    default_rest_seconds: 0,
    tempo: null,
  },
  {
    slug: 'scapular-push-ups',
    name: 'Scapular Push-ups',
    category: 'warmup',
    primary_muscles: ['serratus anterior'],
    secondary_muscles: ['mid traps', 'rhomboids'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('scapular-push-ups'),
    posture_cues: [
      'Straight arms the entire time — elbows do not bend',
      'Hollow body — squeeze glutes and brace the abs',
      'Initiate from the shoulder blades, not the head',
    ],
    benefits: {
      physiological: [
        'Activates serratus anterior before pressing work',
        'Improves scapular upward rotation',
      ],
      aesthetic: [],
      functional: ['Protects the shoulder in bench and overhead work'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'High plank position — arms locked out, hollow body.' },
      {
        phase: 'eccentric',
        instruction:
          'Let the shoulder blades draw together — chest sags slightly toward the floor.',
      },
      {
        phase: 'concentric',
        instruction: 'Push the floor away — shoulder blades spread wide; upper back rounds.',
      },
    ],
    safety_warnings: ['Elbows stay straight — any bending and this becomes a push-up.'],
    contraindications: ['Wrist pain — regress to a quadruped version on fists or push-up bars'],
    body_changes_to_watch: {
      green_flags: ['Greater range of scapular motion', 'Bench and overhead feel more "connected"'],
      red_flags: ['Shoulder pinching at the top'],
    },
    common_mistakes: [
      {
        mistake: 'Bending the elbows',
        correction: 'Think "push the ceiling away" with straight arms.',
      },
      { mistake: 'Sagging hips', correction: 'Squeeze glutes hard — it is a plank too.' },
      {
        mistake: 'Tiny range of motion',
        correction: 'Protract fully at the top; retract fully at the bottom.',
      },
    ],
    progression: 'push-ups',
    regression: null,
    default_sets: [1, 2],
    default_reps: [8, 12],
    default_rest_seconds: 20,
    tempo: null,
  },
  {
    slug: 'hip-90-90',
    name: 'Hip 90/90',
    category: 'warmup',
    primary_muscles: ['hips (internal + external rotators)'],
    secondary_muscles: ['adductors', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('hip-90-90'),
    posture_cues: [
      'Front leg at 90°, back leg at 90° — shins form an L',
      'Chest stays tall through the transition',
      'Drive knees to the floor, not the hands',
    ],
    benefits: {
      physiological: ['Restores rotational range of the hip joint'],
      aesthetic: [],
      functional: ['Unlocks squat depth and stride length'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Sit with front leg bent 90° in front, back leg bent 90° to the side.',
      },
      {
        phase: 'concentric',
        instruction: 'Pick both knees up and rotate to the opposite 90/90 position.',
      },
      {
        phase: 'lockout',
        instruction: 'Hold the new position for 2 seconds with knees pressed down.',
      },
    ],
    safety_warnings: [
      'Do not force knee-to-floor if the hip pinches — work within the available range.',
    ],
    contraindications: ['Acute knee meniscus issue'],
    body_changes_to_watch: {
      green_flags: ['Knees descend closer to the floor each week', 'Easier to sit cross-legged'],
      red_flags: ['Pinching in the front hip that does not resolve with warm-up'],
    },
    common_mistakes: [
      {
        mistake: 'Cheating by lifting the pelvis',
        correction: 'Pelvis stays planted; only the legs rotate.',
      },
      {
        mistake: 'Rushing through reps',
        correction: 'Pause in each end position for a full breath.',
      },
      {
        mistake: 'Forcing depth',
        correction: 'Work in a pain-free range — range grows over weeks.',
      },
    ],
    progression: null,
    regression: null,
    default_sets: [1, 2],
    default_reps: [6, 10],
    default_rest_seconds: 15,
    tempo: null,
  },
  {
    slug: 'band-pull-apart',
    name: 'Band Pull-apart',
    category: 'warmup',
    primary_muscles: ['rear delts', 'rhomboids'],
    secondary_muscles: ['mid traps'],
    equipment: ['band'],
    difficulty: 'beginner',
    gif_url: GIF('band-pull-apart'),
    posture_cues: [
      'Band at shoulder height, arms straight',
      'Pull the band apart by driving the shoulder blades together',
      'Thumbs up — externally rotated shoulders',
    ],
    benefits: {
      physiological: ['Activates the upper back before pressing', 'Reinforces scapular retraction'],
      aesthetic: ['Over time, builds visible rear-delt thickness'],
      functional: ['Shoulder-health staple — directly opposes desk posture'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction:
          'Stand tall, band held at shoulder height with straight arms, hands shoulder-width.',
      },
      {
        phase: 'concentric',
        instruction:
          'Pull the band apart, squeezing shoulder blades together — hands end beside the hips of the chest.',
      },
      {
        phase: 'eccentric',
        instruction: 'Return slowly under control — do not let the band snap back.',
      },
    ],
    safety_warnings: ['Use a band light enough that you can complete the full range with tempo.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: [
        'Pressing lifts feel more stable in the rack position',
        'Less neck tension after desk work',
      ],
      red_flags: ['Sharp shoulder pain in retraction — stop and assess'],
    },
    common_mistakes: [
      {
        mistake: 'Bending the elbows',
        correction: 'Lock the arms out; the movement happens at the shoulder blades.',
      },
      {
        mistake: 'Shrugging up at the top',
        correction: 'Keep the neck long; retract down and back, not up.',
      },
      {
        mistake: 'Using a band that is too heavy',
        correction: 'Pick one that lets you do 20 clean reps.',
      },
    ],
    progression: 'face-pull',
    regression: null,
    default_sets: [2, 3],
    default_reps: [12, 20],
    default_rest_seconds: 30,
    tempo: null,
  },
  {
    slug: 'leg-swings',
    name: 'Leg Swings (Front-Back + Lateral)',
    category: 'warmup',
    primary_muscles: ['hip flexors', 'adductors', 'hamstrings'],
    secondary_muscles: ['glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('leg-swings'),
    posture_cues: [
      'Hold something stable — wall, rack, pole',
      'Stand tall, abs braced — do not arch through the low back',
      'Start small; build range over reps',
    ],
    benefits: {
      physiological: ['Dynamic hip mobility before squats/deadlifts'],
      aesthetic: [],
      functional: ['Prepares the hip for sprinting, changing direction, and heavy lower work'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Brace one hand on a stable object, stand tall.' },
      {
        phase: 'concentric',
        instruction: 'Swing one leg front-to-back, progressively increasing range over 10 reps.',
      },
      {
        phase: 'concentric',
        instruction: 'Switch to lateral swings — cross body to outside — 10 reps per leg.',
      },
    ],
    safety_warnings: ['Do not yank the range — build gradually over the set.'],
    contraindications: ['Acute groin or hamstring strain'],
    body_changes_to_watch: {
      green_flags: ['Squat depth feels easier over weeks'],
      red_flags: ['Grabbing or catching sensation in the hip'],
    },
    common_mistakes: [
      {
        mistake: 'Arching the low back on the forward swing',
        correction: 'Brace the abs, tuck the pelvis slightly.',
      },
      {
        mistake: 'Starting with a maximum-range swing',
        correction: 'First 3 reps are small; grow from there.',
      },
      { mistake: 'Using momentum to snap the hip', correction: 'Controlled swings — not kicks.' },
    ],
    progression: null,
    regression: null,
    default_sets: [1, 2],
    default_reps: [10, 12],
    default_rest_seconds: 15,
    tempo: null,
  },
  {
    slug: 'glute-bridge',
    name: 'Glute Bridge',
    category: 'warmup',
    primary_muscles: ['glutes'],
    secondary_muscles: ['hamstrings', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('glute-bridge'),
    posture_cues: [
      'Heels close to the glutes, feet flat',
      'Drive through the heels, not the toes',
      'Squeeze glutes hard at the top; do not hyperextend the low back',
    ],
    benefits: {
      physiological: ['Activates glutes before hinge and squat patterns'],
      aesthetic: [],
      functional: ['Re-educates the hip extensor pattern often inhibited by sitting'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Lie on the back, knees bent, heels pulled close to the glutes.',
      },
      {
        phase: 'concentric',
        instruction:
          'Drive hips up by squeezing glutes — body forms a straight line from knees to shoulders.',
      },
      {
        phase: 'eccentric',
        instruction: 'Lower under control; glutes tap the floor but stay engaged.',
      },
    ],
    safety_warnings: [
      'Do not overextend the lumbar at the top — stop where glutes are fully contracted.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: [
        'Glutes, not hamstrings, do most of the work',
        'Heavier hinge work feels more connected',
      ],
      red_flags: ['Low-back cramping — regress range and rebuild the brace'],
    },
    common_mistakes: [
      {
        mistake: 'Cramping in the hamstrings',
        correction: 'Move heels further from the glutes; engage the glutes first.',
      },
      {
        mistake: 'Arching the low back at the top',
        correction: 'Tuck the pelvis slightly; lock out at hip extension, not lumbar extension.',
      },
      { mistake: 'Pushing through the toes', correction: 'Rock weight back onto the heels.' },
    ],
    progression: 'hip-thrust',
    regression: null,
    default_sets: [2, 3],
    default_reps: [10, 15],
    default_rest_seconds: 30,
    tempo: null,
  },
]

// ---------------------------------------------------------------------------
// Mobility drills
// ---------------------------------------------------------------------------

const mobility: Exercise[] = [
  {
    slug: 'couch-stretch',
    name: 'Couch Stretch',
    category: 'mobility',
    primary_muscles: ['hip flexors', 'quadriceps'],
    secondary_muscles: [],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    gif_url: GIF('couch-stretch'),
    posture_cues: [
      'Back shin flat against a wall or couch',
      'Tuck the pelvis — do not arch the low back',
      'Squeeze the glute of the back leg to deepen the hip flexor stretch',
    ],
    benefits: {
      physiological: [
        'Opens chronically tight hip flexors from sitting',
        'Improves hip extension range',
      ],
      aesthetic: ['Tall posture reads leaner through the torso'],
      functional: [
        'Unlocks squat and deadlift positions',
        'Relieves a common source of low-back discomfort',
      ],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Place back shin vertically against a wall or couch, front leg in a lunge.',
      },
      {
        phase: 'concentric',
        instruction: 'Tuck pelvis, squeeze back glute, hold for 60-90 seconds.',
      },
      { phase: 'lockout', instruction: 'Switch sides. Breathe into the stretch; do not bounce.' },
    ],
    safety_warnings: ['Padding under the back knee helps — a mat or folded towel.'],
    contraindications: ['Acute knee issue that prevents full flexion'],
    body_changes_to_watch: {
      green_flags: [
        'Easier hip extension in deadlift lockouts',
        'Less low-back tension after desk days',
      ],
      red_flags: ['Sharp anterior hip pain that lasts more than a few seconds'],
    },
    common_mistakes: [
      {
        mistake: 'Arching the low back to fake depth',
        correction: 'Tuck the pelvis and stay neutral — the hip flexor has to take the stretch.',
      },
      {
        mistake: 'Rushing through 20 seconds',
        correction: 'Hold each side 60-90 seconds for real range change.',
      },
      {
        mistake: 'Shifting hips backward',
        correction: 'Front foot drives forward until the stretch is felt at the back hip.',
      },
    ],
    progression: null,
    regression: 'hip-90-90',
    default_sets: [1, 2],
    default_reps: [60, 90],
    default_rest_seconds: 0,
    tempo: null,
  },
  {
    slug: 'pigeon-pose',
    name: 'Pigeon Pose',
    category: 'mobility',
    primary_muscles: ['glutes', 'external hip rotators'],
    secondary_muscles: ['piriformis'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('pigeon-pose'),
    posture_cues: [
      'Front shin as parallel to the front of the mat as mobility allows',
      'Back leg straight behind, hips squared',
      'Fold forward over the front shin to deepen',
    ],
    benefits: {
      physiological: ['Stretches the external hip rotators and glutes'],
      aesthetic: [],
      functional: ['Releases tension from prolonged sitting'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction:
          'From a tabletop, slide one knee forward behind the wrist; extend the other leg back.',
      },
      {
        phase: 'concentric',
        instruction: 'Square the hips toward the floor; support on forearms or chest.',
      },
      { phase: 'lockout', instruction: 'Hold 60-90 seconds per side, breathing into the stretch.' },
    ],
    safety_warnings: [
      'If the front knee complains, reduce shin angle or prop the same-side hip on a pillow.',
    ],
    contraindications: ['Acute knee injury'],
    body_changes_to_watch: {
      green_flags: ['Glute tightness dissipates', 'Lower-back discomfort after sitting reduces'],
      red_flags: ['Sharp front-knee pain'],
    },
    common_mistakes: [
      {
        mistake: 'Hips rolled to the open side',
        correction: 'Square the hips by propping the open-side hip on a block.',
      },
      { mistake: 'Holding the breath', correction: 'Slow nasal breathing — 4 seconds in, 6 out.' },
      { mistake: 'Bouncing the hip down', correction: 'Settle into gravity; do not force.' },
    ],
    progression: null,
    regression: 'hip-90-90',
    default_sets: [1, 2],
    default_reps: [60, 90],
    default_rest_seconds: 0,
    tempo: null,
  },
  {
    slug: 'thoracic-rotation-quadruped',
    name: 'Quadruped Thoracic Rotation',
    category: 'mobility',
    primary_muscles: ['thoracic spine'],
    secondary_muscles: ['obliques'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('thoracic-rotation-quadruped'),
    posture_cues: [
      'Start in quadruped; hand behind the head',
      'Rotate from the rib cage, not from the low back',
      'Exhale as the elbow rotates up',
    ],
    benefits: {
      physiological: ['Direct mobility for the thoracic spine — often locked by desk work'],
      aesthetic: ['Supports upright carriage — reads leaner through the trunk'],
      functional: ['Unlocks overhead and rack positions', 'Reduces compensatory lumbar rotation'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Quadruped — wrists under shoulders, one hand behind the head.',
      },
      {
        phase: 'concentric',
        instruction: 'Rotate the elbow up toward the ceiling as far as comfortable.',
      },
      { phase: 'eccentric', instruction: 'Rotate under the opposite arm — thread the needle.' },
    ],
    safety_warnings: ['Move in the thoracic spine only — do not twist through the low back.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Overhead reach improves', 'Bench and squat rack positions feel more natural'],
      red_flags: ['Sharp pain between shoulder blades — back off range'],
    },
    common_mistakes: [
      {
        mistake: 'Rotating from the hips',
        correction: 'Hips stay square; rotation is in the rib cage only.',
      },
      {
        mistake: 'Losing the bracing grip on the head',
        correction: 'Palm stays flat against the head to anchor the arm.',
      },
      {
        mistake: 'Rushing the reps',
        correction: '3 seconds up, 3 seconds down — mobility is earned in slow reps.',
      },
    ],
    progression: null,
    regression: null,
    default_sets: [2, 3],
    default_reps: [8, 10],
    default_rest_seconds: 20,
    tempo: null,
  },
  {
    slug: 'wall-slides',
    name: 'Wall Slides',
    category: 'mobility',
    primary_muscles: ['serratus anterior', 'lower traps'],
    secondary_muscles: ['thoracic spine'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('wall-slides'),
    posture_cues: [
      'Back against a wall — low back flush',
      'Elbows and wrists maintain contact with the wall throughout',
      'Reach tall from the shoulder blades, not from shrugging',
    ],
    benefits: {
      physiological: ['Teaches shoulder blades to upwardly rotate — critical for overhead work'],
      aesthetic: ['Helps reverse rounded-shoulder posture'],
      functional: ['Improves overhead press mechanics'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Stand with back, head, elbows, and wrists against a wall.' },
      {
        phase: 'concentric',
        instruction: 'Slide the arms up the wall as high as possible without losing contact.',
      },
      {
        phase: 'eccentric',
        instruction: 'Slide back to starting position maintaining the same contact points.',
      },
    ],
    safety_warnings: [
      'If you cannot maintain wrist contact — do not force it. Work where you can.',
    ],
    contraindications: ['Acute shoulder impingement — consult rehab provider'],
    body_changes_to_watch: {
      green_flags: [
        'Overhead press becomes more comfortable',
        'Less neck tension during desk work',
      ],
      red_flags: ['Sharp impingement sensation at the top'],
    },
    common_mistakes: [
      {
        mistake: 'Arching the low back to fake range',
        correction: 'Low back stays flush to the wall; ribs down.',
      },
      {
        mistake: 'Elbows drifting off the wall',
        correction: 'Reduce range until you can keep both elbows and wrists in contact.',
      },
      { mistake: 'Shrugging', correction: 'Reach from the shoulder blades — not the traps.' },
    ],
    progression: null,
    regression: null,
    default_sets: [2, 3],
    default_reps: [8, 12],
    default_rest_seconds: 20,
    tempo: null,
  },
  {
    slug: 'neck-retraction',
    name: 'Neck Retraction (Chin Tuck)',
    category: 'mobility',
    primary_muscles: ['deep neck flexors'],
    secondary_muscles: [],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('neck-retraction'),
    posture_cues: [
      'Think "double chin" — draw the head straight back',
      'Do not tilt the chin up or down — level glide',
      'Hold at end range for 2 seconds; relax',
    ],
    benefits: {
      physiological: ['Activates deep neck flexors that weaken from forward-head posture'],
      aesthetic: [
        'Supports the visible jawline as it emerges with fat loss — forward-head posture blurs the jaw-neck transition',
      ],
      functional: ['Reduces tension headaches', 'Improves bracing in overhead work'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Sit or stand tall, shoulders relaxed.' },
      {
        phase: 'concentric',
        instruction: 'Glide the head straight back — double-chin cue — do not tilt.',
      },
      { phase: 'lockout', instruction: 'Hold 2 seconds, return slowly.' },
    ],
    safety_warnings: [
      'If retraction causes dizziness or tingling in the arms, stop and consult a provider.',
    ],
    contraindications: ['Cervical disc pathology'],
    body_changes_to_watch: {
      green_flags: ['Fewer tension headaches', 'Jawline appears sharper as fat drops'],
      red_flags: ['Dizziness, numbness, or tingling'],
    },
    common_mistakes: [
      {
        mistake: 'Tilting the chin down',
        correction: 'Keep eyes level; only the head moves backward.',
      },
      {
        mistake: 'Using the hands to push',
        correction: 'Move from the neck muscles, not external pressure.',
      },
      {
        mistake: 'Going too fast',
        correction: '2 seconds in, 2 seconds out — slow is what teaches the pattern.',
      },
    ],
    progression: null,
    regression: null,
    default_sets: [2, 3],
    default_reps: [10, 12],
    default_rest_seconds: 15,
    tempo: null,
  },
  {
    slug: 'dead-hang',
    name: 'Dead Hang',
    category: 'mobility',
    primary_muscles: ['grip', 'lats'],
    secondary_muscles: ['decompressed spine'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('dead-hang'),
    posture_cues: [
      'Full hang — no shrug; let the shoulders lift toward the ears naturally',
      'Actively breathe — do not hold your breath',
      'Engage the lats slightly to protect the shoulder',
    ],
    benefits: {
      physiological: [
        'Decompresses the spine after loaded work',
        'Builds grip and shoulder tissue resilience',
      ],
      aesthetic: ['Lengthens perceived torso under fat loss'],
      functional: ['Directly transfers to pull-ups and carries'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Grab a pull-up bar with a double-overhand grip.' },
      { phase: 'concentric', instruction: 'Hang with relaxed but engaged shoulders.' },
      { phase: 'lockout', instruction: 'Hold for time; step off safely when done.' },
    ],
    safety_warnings: ['Ease off the bar with both feet — do not drop.'],
    contraindications: ['Recent shoulder dislocation'],
    body_changes_to_watch: {
      green_flags: ['Hang time extends', 'Grip strength carries over to deadlifts'],
      red_flags: ['Sharp shoulder pain at the bottom of the hang — stop'],
    },
    common_mistakes: [
      {
        mistake: 'Totally passive hanging',
        correction: 'Engage lats slightly so the shoulders are not taking dead weight.',
      },
      { mistake: 'Holding the breath', correction: 'Nasal breathing throughout.' },
      { mistake: 'Dropping off the bar', correction: 'Step down both feet or use a bench.' },
    ],
    progression: 'pull-ups',
    regression: null,
    default_sets: [2, 3],
    default_reps: [20, 45],
    default_rest_seconds: 60,
    tempo: null,
  },
]
// ---------------------------------------------------------------------------
// Push — barbell and dumbbell
// ---------------------------------------------------------------------------

const push: Exercise[] = [
  {
    slug: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    category: 'push',
    primary_muscles: ['pectorals'],
    secondary_muscles: ['triceps', 'anterior deltoid'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('barbell-bench-press'),
    posture_cues: [
      'Shoulder blades retracted and depressed — pinned to the bench throughout',
      'Feet planted; slight arch in the upper back is fine, lower back stays in contact',
      'Grip just outside shoulder width; wrists stacked over elbows',
      'Bar path: lower to the lower chest, press up-and-slightly-back toward the shoulder',
      'Full range — bar touches the chest without bouncing',
    ],
    benefits: {
      physiological: [
        'Primary horizontal press — main driver of upper-body strength',
        'Develops chest, front delt, and tricep mass',
      ],
      aesthetic: ['Builds visible chest thickness and upper-body silhouette'],
      functional: ['Carries over to push-ups, pushing heavy objects, and overall upper-body power'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Lie on the bench — eyes under the bar. Retract shoulder blades, plant feet.',
      },
      {
        phase: 'setup',
        instruction: 'Unrack with straight arms; bar travels forward over the shoulder joint.',
      },
      {
        phase: 'eccentric',
        instruction: 'Lower under control to the lower chest — 2-3 seconds down.',
      },
      { phase: 'bottom', instruction: 'Bar lightly touches the chest without bouncing.' },
      { phase: 'concentric', instruction: 'Drive the bar up and back toward the shoulder joint.' },
      {
        phase: 'lockout',
        instruction: 'Arms straight, shoulder blades still pinned; reset breath before next rep.',
      },
    ],
    safety_warnings: [
      'ALWAYS use safety pins or a spotter when pressing heavy',
      'Do not flare elbows to 90° — keep them 60-75° relative to the torso',
      'Weight progression rule: max +1.25 kg/week unless two consecutive weeks of ≥ 90% set completion',
    ],
    contraindications: ['Acute shoulder impingement — substitute floor press', 'Pec strain'],
    body_changes_to_watch: {
      green_flags: [
        'Chest feels pumped and worked (not shoulders)',
        'Bar speed improves at the same load over weeks',
      ],
      red_flags: [
        'Sharp anterior-shoulder pain during descent — stop and reassess grip width',
        'Wrists hurt — bar is likely on the palm, not the heel of the hand',
      ],
    },
    common_mistakes: [
      {
        mistake: 'Elbows flared 90° out',
        correction: 'Tuck elbows to 60-75° — protects the shoulder.',
      },
      {
        mistake: 'Shoulder blades unpinning mid-set',
        correction: 'Re-cue "pull the blades into your back pockets" before each rep.',
      },
      {
        mistake: 'Bouncing the bar off the chest',
        correction: 'Touch-and-pause for 1 second before pressing.',
      },
      { mistake: 'Feet dancing around', correction: 'Plant feet hard at setup and leave them.' },
    ],
    progression: 'close-grip-bench-press',
    regression: 'incline-dumbbell-press',
    default_sets: [3, 4],
    default_reps: [5, 8],
    default_rest_seconds: 150,
    tempo: '2-1-1-0',
  },
  {
    slug: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    category: 'push',
    primary_muscles: ['upper pectorals'],
    secondary_muscles: ['anterior deltoid', 'triceps'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    gif_url: GIF('incline-dumbbell-press'),
    posture_cues: [
      '30-45° bench angle — steeper than 45° makes it a shoulder press',
      'Shoulder blades pinned, feet planted',
      'Elbows at ~45° from the torso',
    ],
    benefits: {
      physiological: [
        'Emphasises upper-chest fibres',
        'Shoulder-friendlier than the barbell for many',
      ],
      aesthetic: ['Develops the upper chest shelf visible under a tee'],
      functional: ['Unilateral load — evens out side-to-side pressing strength'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction:
          'Set bench at 30-45°. Dumbbells at shoulder height with palms forward or neutral.',
      },
      {
        phase: 'eccentric',
        instruction: 'Lower under control until upper arms are just past parallel to the floor.',
      },
      {
        phase: 'concentric',
        instruction: 'Press up and slightly in; do not clash the bells at the top.',
      },
      { phase: 'lockout', instruction: 'Just short of lockout keeps tension on the pecs.' },
    ],
    safety_warnings: [
      'Get help handing the bells up once loads climb — do not fight them into position from the floor.',
    ],
    contraindications: ['Acute shoulder issue'],
    body_changes_to_watch: {
      green_flags: ['Upper chest fills out visibly over weeks'],
      red_flags: ['Anterior shoulder pain — check bench angle and elbow flare'],
    },
    common_mistakes: [
      {
        mistake: 'Bench too steep',
        correction: '30-45° max — any steeper and shoulders dominate.',
      },
      { mistake: 'Elbows flared 90°', correction: '~45° angle from torso.' },
      {
        mistake: 'Pressing inward and clashing dumbbells',
        correction: 'Dumbbells travel straight up — no clash at the top.',
      },
    ],
    progression: 'barbell-bench-press',
    regression: 'push-ups',
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 90,
    tempo: null,
  },
  {
    slug: 'overhead-press',
    name: 'Overhead Press (Barbell)',
    category: 'push',
    primary_muscles: ['deltoids'],
    secondary_muscles: ['triceps', 'upper pectorals', 'core'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('overhead-press'),
    posture_cues: [
      'Grip just outside shoulder width — elbows directly under the bar at the start',
      'Brace core hard; glutes squeezed — no overhead rebound from the hips',
      'Chin tucked as bar passes the face; press bar over the middle of the foot',
      'Lock out at ears — biceps by ears',
      'Shrug up at the top to finish the lockout',
    ],
    benefits: {
      physiological: ['Premier shoulder builder', 'Teaches full-body bracing under load'],
      aesthetic: [
        'Builds round, capped shoulders — one of the best single lifts for the upper-body V',
      ],
      functional: ['Direct transfer to any overhead push'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Bar in front rack, elbows slightly in front, core braced.' },
      {
        phase: 'concentric',
        instruction: 'Press the bar up; move your head out of the way as the bar passes.',
      },
      { phase: 'lockout', instruction: 'Finish with bar over mid-foot, biceps by ears, shrug up.' },
      { phase: 'eccentric', instruction: 'Lower under control back to the front rack.' },
    ],
    safety_warnings: [
      'Brace before every rep — overhead pressing with a loose core injures low backs',
      'Keep ribs DOWN — do not press by hyperextending the lumbar',
      'Max +1.25 kg/week at this lift unless two consecutive weeks at ≥ 90% completion',
    ],
    contraindications: [
      'Acute shoulder impingement — substitute seated DB press at a steep angle first',
    ],
    body_changes_to_watch: {
      green_flags: ['Bar speed improves on the same load', 'Overall posture feels stronger'],
      red_flags: ['Low-back pain during the press — core brace broke down'],
    },
    common_mistakes: [
      {
        mistake: 'Layback into a standing incline press',
        correction: 'Glutes squeezed, ribs down — strict press only.',
      },
      {
        mistake: 'Elbows start behind the bar',
        correction: 'Elbows stack under the bar at the start.',
      },
      {
        mistake: 'Pressing bar forward over the face',
        correction: 'Head moves back as bar passes; bar finishes over mid-foot.',
      },
      {
        mistake: 'No shrug at lockout',
        correction: 'Finish with a shrug — protects the shoulder.',
      },
    ],
    progression: null,
    regression: 'seated-dumbbell-shoulder-press',
    default_sets: [3, 4],
    default_reps: [5, 8],
    default_rest_seconds: 150,
    tempo: null,
  },
  {
    slug: 'seated-dumbbell-shoulder-press',
    name: 'Seated Dumbbell Shoulder Press',
    category: 'push',
    primary_muscles: ['deltoids'],
    secondary_muscles: ['triceps'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    gif_url: GIF('seated-dumbbell-shoulder-press'),
    posture_cues: [
      'Bench angle 75-90°',
      'Dumbbells at ear height, palms forward or slightly in (neutral also fine)',
      'Press up — do not clash the bells',
    ],
    benefits: {
      physiological: ['Shoulder hypertrophy with less axial loading than the barbell'],
      aesthetic: ['Fills out the side and front deltoid'],
      functional: ['Evens out side-to-side pressing asymmetries'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Sit tall against the bench, dumbbells at ear height.' },
      { phase: 'concentric', instruction: 'Press the dumbbells up and slightly in.' },
      { phase: 'eccentric', instruction: 'Lower under control to the start position.' },
    ],
    safety_warnings: [
      'Get spot help placing heavy dumbbells — do not fight them up from the knees.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Shoulder mass visibly increasing'],
      red_flags: ['Pinching at the top — back off range'],
    },
    common_mistakes: [
      { mistake: 'Arching the low back', correction: 'Tuck the ribs, glutes braced.' },
      { mistake: 'Pressing too wide', correction: 'Dumbbells travel up — not arcing outward.' },
      {
        mistake: 'Short range',
        correction: 'Dumbbells start at ear height, end just short of lockout.',
      },
    ],
    progression: 'overhead-press',
    regression: null,
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'push-ups',
    name: 'Push-ups',
    category: 'push',
    primary_muscles: ['pectorals'],
    secondary_muscles: ['triceps', 'anterior deltoid', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('push-ups'),
    posture_cues: [
      'Hollow body — glutes squeezed, abs braced',
      'Hands under the shoulders, elbows ~45° from the torso at the bottom',
      'Chest touches the floor; lockout with straight arms and active scapulae',
    ],
    benefits: {
      physiological: ['Low-barrier upper-body pressing strength', 'Excellent scapular stabilizer'],
      aesthetic: ['Chest and tricep development'],
      functional: ['Universal fitness test'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Plank — hands under shoulders, body straight, hollow.' },
      { phase: 'eccentric', instruction: 'Lower under control; elbows 45° from torso.' },
      { phase: 'bottom', instruction: 'Chest taps the floor without losing the hollow.' },
      { phase: 'concentric', instruction: 'Press up, body rises as one unit.' },
    ],
    safety_warnings: ['Wrist health — use push-up bars or fists if flat-palm bothers you.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Rep counts rise over weeks; form stays clean'],
      red_flags: ['Shoulder pain front-and-up — likely flaring elbows; re-tuck'],
    },
    common_mistakes: [
      { mistake: 'Hips sagging', correction: 'Glutes squeezed; body in one straight line.' },
      { mistake: 'Elbows flared to 90°', correction: '45° from torso — saves the shoulder.' },
      { mistake: 'Half reps', correction: 'Chest must touch; arms must lock out.' },
    ],
    progression: 'dips',
    regression: null,
    default_sets: [3, 4],
    default_reps: [8, 15],
    default_rest_seconds: 60,
    tempo: '3-0-1-0',
  },
  {
    slug: 'dips',
    name: 'Parallel-Bar Dips',
    category: 'push',
    primary_muscles: ['lower pectorals', 'triceps'],
    secondary_muscles: ['anterior deltoid'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    gif_url: GIF('dips'),
    posture_cues: [
      'Lean forward slightly to emphasise chest; upright for tricep',
      'Descend until upper arm is parallel to the floor',
      'Lock out fully — but do not hyperextend the elbows',
    ],
    benefits: {
      physiological: ['Compound upper-body press hitting chest, tricep, delt together'],
      aesthetic: ['Builds the lower chest shelf'],
      functional: ['Strong pushing base for many everyday actions'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Mount the dip bars with straight arms, shoulders packed down.',
      },
      { phase: 'eccentric', instruction: 'Lower until upper arms reach parallel to the floor.' },
      {
        phase: 'concentric',
        instruction: 'Press back up to straight arms without locking out the elbows aggressively.',
      },
    ],
    safety_warnings: [
      'If shoulders feel unstable at the bottom — stop going that deep',
      'Add weight with a belt once bodyweight sets are 10+ reps clean',
    ],
    contraindications: ['Acute shoulder impingement — substitute push-ups until resolved'],
    body_changes_to_watch: {
      green_flags: ['Rep count grows; later, loaded weight climbs'],
      red_flags: ['Sharp anterior shoulder pain — back off depth'],
    },
    common_mistakes: [
      { mistake: 'Swinging', correction: 'Keep body tight; no kipping.' },
      {
        mistake: 'Dipping too deep',
        correction: 'Parallel is enough — more depth puts the shoulder at risk.',
      },
      {
        mistake: 'Shoulders shrugging at the top',
        correction: 'Pack the shoulders down; active scapulae.',
      },
    ],
    progression: null,
    regression: 'push-ups',
    default_sets: [3, 3],
    default_reps: [6, 10],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'lateral-raises',
    name: 'Dumbbell Lateral Raises',
    category: 'push',
    primary_muscles: ['side deltoid'],
    secondary_muscles: ['supraspinatus'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    gif_url: GIF('lateral-raises'),
    posture_cues: [
      'Slight forward lean — thumbs slightly up',
      'Lead with the elbows, not the hands',
      'Raise to shoulder height — not above',
    ],
    benefits: {
      physiological: ['Direct side-delt hypertrophy — most of delt "cap" is side head'],
      aesthetic: ['Widens shoulders visibly — the biggest aesthetic lever for the upper-body V'],
      functional: ['Supports overhead pressing strength'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction:
          'Stand with a slight forward lean, dumbbells at the sides, thumbs slightly up.',
      },
      {
        phase: 'concentric',
        instruction: 'Raise the arms outward — elbows lead, slight bend throughout.',
      },
      { phase: 'eccentric', instruction: 'Lower under control over 2-3 seconds.' },
    ],
    safety_warnings: [
      'Go lighter than you think — ego-lateral-raises shrug up and miss the side delt.',
    ],
    contraindications: ['Shoulder impingement'],
    body_changes_to_watch: {
      green_flags: ['Visible shoulder width increase over 8 weeks'],
      red_flags: ['Shoulder pinching at the top — reduce range or load'],
    },
    common_mistakes: [
      {
        mistake: 'Raising above shoulder height',
        correction: 'Stop at parallel — going higher recruits traps.',
      },
      { mistake: 'Using momentum', correction: 'Strict form; lighter weight.' },
      { mistake: 'Shrugging up', correction: 'Keep the neck long; lead from the elbows.' },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 3],
    default_reps: [12, 15],
    default_rest_seconds: 45,
    tempo: null,
  },
  {
    slug: 'close-grip-bench-press',
    name: 'Close-Grip Bench Press',
    category: 'push',
    primary_muscles: ['triceps'],
    secondary_muscles: ['pectorals', 'anterior deltoid'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('close-grip-bench-press'),
    posture_cues: [
      'Grip shoulder-width — not narrower (protects the wrist)',
      'Elbows tuck closer to the torso than a standard bench',
      'Retract shoulder blades; feet planted',
    ],
    benefits: {
      physiological: ['Hypertrophy for the triceps while still getting chest involvement'],
      aesthetic: ['Builds tricep thickness — arm size is 2/3 tricep'],
      functional: ['Stronger lockout on the standard bench'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Lie back, grip shoulder-width.' },
      { phase: 'eccentric', instruction: 'Lower bar to lower sternum with elbows tucked tight.' },
      { phase: 'concentric', instruction: 'Press up — triceps drive the movement.' },
    ],
    safety_warnings: [
      'Do not grip narrower than shoulder width — wrists and elbows pay the price.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Tricep lockout on regular bench feels stronger'],
      red_flags: ['Wrist pain — widen the grip to shoulder-width'],
    },
    common_mistakes: [
      { mistake: 'Grip too narrow', correction: 'Shoulder-width — not inside.' },
      { mistake: 'Elbows flaring', correction: 'Elbows tight to torso.' },
      { mistake: 'Partial range', correction: 'Bar touches the chest, arms lock out at the top.' },
    ],
    progression: null,
    regression: 'cable-triceps-pushdown',
    default_sets: [3, 3],
    default_reps: [6, 8],
    default_rest_seconds: 120,
    tempo: null,
  },
  {
    slug: 'skull-crushers',
    name: 'Skull Crushers (EZ Bar)',
    category: 'push',
    primary_muscles: ['triceps'],
    secondary_muscles: [],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('skull-crushers'),
    posture_cues: [
      'Upper arms angled slightly back from vertical — not straight up',
      'Elbows do not flare out',
      'Bar travels to above the forehead or just behind',
    ],
    benefits: {
      physiological: ['Isolates the tricep in the stretched position'],
      aesthetic: ['Develops the long head of the tricep — biggest contributor to arm size'],
      functional: ['Supports pressing lockout strength'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Lie on bench with arms angled slightly back, EZ bar at shoulder width.',
      },
      {
        phase: 'eccentric',
        instruction: 'Lower the bar by bending only the elbows — upper arms stay fixed.',
      },
      { phase: 'concentric', instruction: 'Press back to the start by extending the elbows.' },
    ],
    safety_warnings: ['Nickname is a joke — use a spot or safeties if loads climb.'],
    contraindications: ['Elbow tendonitis'],
    body_changes_to_watch: {
      green_flags: ['Tricep visibility improves'],
      red_flags: ['Elbow pain — reduce load and shorten range'],
    },
    common_mistakes: [
      { mistake: 'Upper arms drifting back', correction: 'Anchor them just past vertical.' },
      {
        mistake: 'Elbows flaring',
        correction: 'Cue "narrow elbows" — point them forward, not out.',
      },
      {
        mistake: 'Excessive range',
        correction: 'Stop where the elbow feels loaded, not compressed.',
      },
    ],
    progression: null,
    regression: 'cable-triceps-pushdown',
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 60,
    tempo: null,
  },
  {
    slug: 'cable-triceps-pushdown',
    name: 'Cable Triceps Pushdown',
    category: 'push',
    primary_muscles: ['triceps'],
    secondary_muscles: [],
    equipment: ['cable'],
    difficulty: 'beginner',
    gif_url: GIF('cable-triceps-pushdown'),
    posture_cues: [
      'Elbows pinned at the sides',
      'Slight forward lean; neutral spine',
      'Full lockout at the bottom',
    ],
    benefits: {
      physiological: ['Constant tension — ideal for higher-rep hypertrophy on the tricep'],
      aesthetic: ['Tricep horseshoe becomes visible'],
      functional: ['Builds lockout capacity for pressing'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Cable high, rope or bar attachment; stand with a slight forward lean.',
      },
      { phase: 'concentric', instruction: 'Press down — elbows stay pinned at the sides.' },
      { phase: 'eccentric', instruction: 'Return under control to a 90° elbow.' },
    ],
    safety_warnings: ['Do not let elbows drift forward — that turns it into a chest-aided push.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Tricep definition appears as fat drops'],
      red_flags: ['Elbow pain — reduce load or switch to dumbbell variant'],
    },
    common_mistakes: [
      { mistake: 'Elbows flaring forward', correction: 'Pin them to the ribs.' },
      {
        mistake: 'Leaning way over to add body weight',
        correction: 'Small lean is fine — no heaving.',
      },
      { mistake: 'Partial range', correction: 'Full lockout at the bottom.' },
    ],
    progression: 'skull-crushers',
    regression: null,
    default_sets: [3, 3],
    default_reps: [10, 12],
    default_rest_seconds: 45,
    tempo: null,
  },
]
// ---------------------------------------------------------------------------
// Pull — back, rear-delt, biceps
// ---------------------------------------------------------------------------

const pull: Exercise[] = [
  {
    slug: 'pull-ups',
    name: 'Pull-ups',
    category: 'pull',
    primary_muscles: ['lats'],
    secondary_muscles: ['biceps', 'rhomboids', 'mid traps'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    gif_url: GIF('pull-ups'),
    posture_cues: [
      'Full hang start — shoulder blades active',
      'Pull the elbows down-and-back, not up',
      'Chin clears the bar; chest rises toward it',
      'Lower under control to a full hang',
    ],
    benefits: {
      physiological: ['Best single lat-width builder', 'Develops grip and upper-back density'],
      aesthetic: ['Builds the V-taper'],
      functional: ['Universal upper-body strength benchmark'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Hang from the bar with an overhand grip just outside shoulder width.',
      },
      {
        phase: 'concentric',
        instruction: 'Pull the elbows down and back; chest rises toward the bar.',
      },
      { phase: 'lockout', instruction: 'Chin clears the bar.' },
      { phase: 'eccentric', instruction: 'Lower under control to a full hang — 2-3 seconds.' },
    ],
    safety_warnings: ['Use a band assist or lat-pulldown if you cannot yet do a clean rep.'],
    contraindications: ['Recent shoulder dislocation'],
    body_changes_to_watch: {
      green_flags: ['Rep count grows', 'Back feels thicker and wider'],
      red_flags: ['Shoulder pinching — reduce to lat pulldown temporarily'],
    },
    common_mistakes: [
      { mistake: 'Kipping / swinging', correction: 'Strict pull-ups only; body does not swing.' },
      {
        mistake: 'Chin over the bar via neck craning',
        correction: 'Chest rises — the neck does not stretch for the rep.',
      },
      { mistake: 'Half hang at the bottom', correction: 'Full hang every rep — no cheated range.' },
    ],
    progression: 'chin-ups',
    regression: 'lat-pulldown',
    default_sets: [3, 4],
    default_reps: [3, 8],
    default_rest_seconds: 120,
    tempo: null,
  },
  {
    slug: 'chin-ups',
    name: 'Chin-ups (Supinated Grip)',
    category: 'pull',
    primary_muscles: ['lats', 'biceps'],
    secondary_muscles: ['mid traps', 'rhomboids'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    gif_url: GIF('chin-ups'),
    posture_cues: [
      'Supinated (palms toward you) grip, shoulder width',
      'Pull elbows straight down',
      'Chin clears the bar with chest leading',
    ],
    benefits: {
      physiological: ['Bigger bicep involvement than pull-ups'],
      aesthetic: ['Arm + back combined builder'],
      functional: ['Many find chins accessible before pull-ups'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Hang with a supinated grip, shoulder width.' },
      { phase: 'concentric', instruction: 'Pull up; chin clears the bar.' },
      { phase: 'eccentric', instruction: 'Lower under control to a full hang.' },
    ],
    safety_warnings: ['Biceps tendons do heavy work here — warm up with light rows first.'],
    contraindications: ['Bicep tendonitis'],
    body_changes_to_watch: {
      green_flags: ['Arm size and back thickness increase together'],
      red_flags: ['Elbow tendon pain'],
    },
    common_mistakes: [
      {
        mistake: 'Only using arms',
        correction: 'Initiate from the back — think "pull elbows to ribs".',
      },
      { mistake: 'Swinging', correction: 'Strict form only.' },
      { mistake: 'No full hang', correction: 'Full range each rep.' },
    ],
    progression: null,
    regression: 'lat-pulldown',
    default_sets: [3, 3],
    default_reps: [5, 10],
    default_rest_seconds: 120,
    tempo: null,
  },
  {
    slug: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    primary_muscles: ['lats'],
    secondary_muscles: ['biceps', 'rhomboids'],
    equipment: ['cable'],
    difficulty: 'beginner',
    gif_url: GIF('lat-pulldown'),
    posture_cues: [
      'Grip just outside shoulder width',
      'Slight lean back — maintain it throughout',
      'Pull the bar to the upper chest, not the stomach',
    ],
    benefits: {
      physiological: ['Trains the pull-up pattern with adjustable load'],
      aesthetic: ['Lat width — builds the V'],
      functional: ['Entry ramp for building pull-up strength'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Sit with thighs under the pad; grip the bar just outside shoulder width.',
      },
      {
        phase: 'concentric',
        instruction: 'Pull the bar to the upper chest, elbows driving down-and-back.',
      },
      { phase: 'eccentric', instruction: 'Return under control; full stretch at the top.' },
    ],
    safety_warnings: [
      'Do not yank into the stomach — pulling to the upper chest preserves shoulder health.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Easier pull-up attempts over weeks'],
      red_flags: ['Neck strain — likely pulling with the wrong muscles'],
    },
    common_mistakes: [
      { mistake: 'Swinging backward to heave weight', correction: 'Set a small lean and hold it.' },
      { mistake: 'Pulling behind the neck', correction: 'Pull to the upper chest only.' },
      { mistake: 'Half range', correction: 'Full stretch at the top, bar to chest at the bottom.' },
    ],
    progression: 'pull-ups',
    regression: null,
    default_sets: [3, 3],
    default_reps: [10, 12],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'barbell-row',
    name: 'Barbell Row',
    category: 'pull',
    primary_muscles: ['mid back', 'lats'],
    secondary_muscles: ['biceps', 'rear delts'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('barbell-row'),
    posture_cues: [
      'Hinge to ~45° torso — flat back, not rounded',
      'Bar against shins at the start; overhand grip just outside the knees',
      'Pull the bar to the lower ribs, not the chest',
      'Control the eccentric; do not drop the bar',
      'Elbows drive back — not flared out',
    ],
    benefits: {
      physiological: ['Most bang-for-buck back exercise', 'Builds horizontal pulling strength'],
      aesthetic: [
        'Builds mid-back and lat thickness — back thickness is the most-underrated physique marker',
      ],
      functional: ['Direct antagonist to the bench — keep your shoulders balanced'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Bar on floor; hinge to a flat back with bar against shins.' },
      {
        phase: 'concentric',
        instruction: 'Row the bar to the lower ribs; elbows drive straight back.',
      },
      { phase: 'eccentric', instruction: 'Lower the bar under control.' },
      { phase: 'lockout', instruction: 'Reset each rep with a clean setup.' },
    ],
    safety_warnings: [
      'Flat back — no lumbar rounding, ever',
      'Reset between reps; fatigue breaks form',
      'Max +1.25 kg/week unless two consecutive weeks ≥ 90% completion',
    ],
    contraindications: ['Acute lower-back pain — substitute chest-supported row until resolved'],
    body_changes_to_watch: {
      green_flags: ['Back thickness visibly grows', 'Deadlift lockout feels stronger'],
      red_flags: ['Lower-back pain — rounding somewhere; film the next set'],
    },
    common_mistakes: [
      { mistake: 'Torso upright — it becomes a shrug', correction: 'Hinge to ~45° and hold it.' },
      { mistake: 'Bar pulled to the chest', correction: 'Bar goes to the lower ribs.' },
      { mistake: 'Elbows flared', correction: 'Drive elbows straight back.' },
      {
        mistake: 'Jerking the bar with the hips',
        correction: 'Strict rows; no English with the hips.',
      },
    ],
    progression: null,
    regression: 'chest-supported-row',
    default_sets: [3, 4],
    default_reps: [5, 8],
    default_rest_seconds: 150,
    tempo: null,
  },
  {
    slug: 'single-arm-dumbbell-row',
    name: 'Single-Arm Dumbbell Row',
    category: 'pull',
    primary_muscles: ['lats', 'mid back'],
    secondary_muscles: ['biceps', 'rear delts'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    gif_url: GIF('single-arm-dumbbell-row'),
    posture_cues: [
      'Support knee and hand on a bench; flat back',
      'Pull the dumbbell to the hip, not straight up',
      'Squeeze the shoulder blade at the top',
    ],
    benefits: {
      physiological: ['Unilateral — addresses side-to-side imbalances'],
      aesthetic: ['Lat and mid-back thickness'],
      functional: ['Spine-friendly alternative to barbell rows on higher-volume days'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Plant the opposite knee and hand on a bench; back flat, hips square.',
      },
      { phase: 'concentric', instruction: 'Row the dumbbell up toward the hip.' },
      { phase: 'eccentric', instruction: 'Lower under control; full stretch at the bottom.' },
    ],
    safety_warnings: ['Do not let the low back sag or rotate — keep the hips squared.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Stronger feeling on the barbell row'],
      red_flags: ['Low-back pain — likely a twisted torso'],
    },
    common_mistakes: [
      { mistake: 'Rowing straight up', correction: 'Angle back toward the hip.' },
      { mistake: 'Twisting the torso for extra range', correction: 'Hips stay square.' },
      { mistake: 'Jerking with momentum', correction: 'Controlled reps; strict tempo.' },
    ],
    progression: 'barbell-row',
    regression: 'seated-cable-row',
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'seated-cable-row',
    name: 'Seated Cable Row',
    category: 'pull',
    primary_muscles: ['mid back', 'lats'],
    secondary_muscles: ['biceps'],
    equipment: ['cable'],
    difficulty: 'beginner',
    gif_url: GIF('seated-cable-row'),
    posture_cues: [
      'Tall chest; slight forward lean at the stretch, upright at the contraction',
      'Pull to the sternum; elbows track close',
      'Squeeze shoulder blades together at the end',
    ],
    benefits: {
      physiological: ['Mid-back hypertrophy with constant tension'],
      aesthetic: ['Back thickness'],
      functional: ['Low-risk back builder — scales cleanly across loads'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction:
          'Sit at the cable station, feet planted, slight lean forward to grab the handle.',
      },
      {
        phase: 'concentric',
        instruction: 'Pull to the sternum; chest lifts, shoulder blades pinch.',
      },
      {
        phase: 'eccentric',
        instruction: 'Return under control; shoulder blades protract at the end.',
      },
    ],
    safety_warnings: ['Do not jerk with the lower back — sit tall and row.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Thicker mid-back over time'],
      red_flags: ['Low-back strain — reset posture'],
    },
    common_mistakes: [
      {
        mistake: 'Leaning back far to cheat weight',
        correction: 'Small lean only — the back does the work.',
      },
      { mistake: 'Elbows flaring', correction: 'Elbows track close to the ribs.' },
      { mistake: 'Jerky reps', correction: '2 seconds up, 2 seconds down.' },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 3],
    default_reps: [10, 12],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'chest-supported-row',
    name: 'Chest-Supported Dumbbell Row',
    category: 'pull',
    primary_muscles: ['mid back', 'rear delts'],
    secondary_muscles: ['biceps', 'lats'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    gif_url: GIF('chest-supported-row'),
    posture_cues: [
      'Incline bench 30-45°; chest flush',
      'Hang the dumbbells with arms fully extended',
      'Row to the hips; do not shrug',
    ],
    benefits: {
      physiological: ['Strictly trained mid-back without lower-back involvement'],
      aesthetic: ['Back width and thickness simultaneously'],
      functional: ['Excellent for anyone fatigued-by-row-setups or with a grumpy low back'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Lie face-down on an incline bench; let the dumbbells hang.' },
      { phase: 'concentric', instruction: 'Row to the hips; shoulder blades squeeze together.' },
      { phase: 'eccentric', instruction: 'Lower under control to the full stretch.' },
    ],
    safety_warnings: ['Do not lift the chest off the bench to cheat load.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Rear delts and mid-traps fill in'],
      red_flags: ['Shoulder pinching — check range and load'],
    },
    common_mistakes: [
      {
        mistake: 'Lifting the chest off the bench',
        correction: 'Chest stays planted — that is the entire point.',
      },
      { mistake: 'Shrugging', correction: 'Neck long; shoulder blades squeeze down-and-back.' },
      { mistake: 'Rowing too high', correction: 'Row to the hips; not the ribs.' },
    ],
    progression: 'barbell-row',
    regression: null,
    default_sets: [3, 3],
    default_reps: [10, 12],
    default_rest_seconds: 60,
    tempo: null,
  },
  {
    slug: 'face-pull',
    name: 'Face Pull',
    category: 'pull',
    primary_muscles: ['rear delts', 'mid traps'],
    secondary_muscles: ['external rotators', 'rhomboids'],
    equipment: ['cable'],
    difficulty: 'beginner',
    gif_url: GIF('face-pull'),
    posture_cues: [
      'Cable set at upper-chest height, rope attachment',
      'Pull the rope to the face with hands splitting wide at the end — thumbs back',
      'Elbows high throughout',
    ],
    benefits: {
      physiological: [
        'Direct work for the rear delts and external rotators — shoulder health staple',
      ],
      aesthetic: ['Rear-delt visibility and upper-back thickness'],
      functional: ['Antidote to desk posture; protects pressing shoulders'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Grab the rope with thumbs back; step back for tension.' },
      {
        phase: 'concentric',
        instruction: 'Pull to the face, hands split wide — thumbs back, elbows high.',
      },
      { phase: 'eccentric', instruction: 'Return under control.' },
    ],
    safety_warnings: [
      'Light weight — this is a postural/shoulder-health lift, not a strength lift.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Pressing lifts feel more stable', 'Shoulder posture improves'],
      red_flags: ['Neck straining — load too heavy'],
    },
    common_mistakes: [
      {
        mistake: 'Using too much weight',
        correction: 'Drop to the lightest weight you can control with clean form.',
      },
      {
        mistake: 'Elbows dropping',
        correction: 'Elbows stay high — level with or slightly above the shoulders.',
      },
      { mistake: 'Pulling to the chest', correction: 'Aim for the face; thumbs back.' },
    ],
    progression: null,
    regression: 'band-pull-apart',
    default_sets: [3, 3],
    default_reps: [12, 15],
    default_rest_seconds: 45,
    tempo: null,
  },
  {
    slug: 'dumbbell-bicep-curl',
    name: 'Dumbbell Bicep Curl',
    category: 'pull',
    primary_muscles: ['biceps'],
    secondary_muscles: ['brachialis'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    gif_url: GIF('dumbbell-bicep-curl'),
    posture_cues: [
      'Elbows pinned at the sides',
      'Supinate as you curl — palm rotates up',
      'Do not use momentum',
    ],
    benefits: {
      physiological: ['Direct bicep hypertrophy'],
      aesthetic: ['Arm size — biceps carry the front of the upper-arm silhouette'],
      functional: ['Carries over to pulling strength on every chin and row'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Stand tall, dumbbells at the sides in a neutral grip.' },
      { phase: 'concentric', instruction: 'Curl up, rotating palms forward as the elbow flexes.' },
      { phase: 'eccentric', instruction: 'Lower under control to the start.' },
    ],
    safety_warnings: ['If elbows hurt on a straight-bar version — stay with dumbbells.'],
    contraindications: ['Bicep tendonitis'],
    body_changes_to_watch: {
      green_flags: ['Visible bicep development'],
      red_flags: ['Elbow pain that persists between sessions'],
    },
    common_mistakes: [
      { mistake: 'Swinging the weight', correction: 'Strict curls; elbows pinned.' },
      { mistake: 'Partial range', correction: 'Full stretch at the bottom, squeeze at the top.' },
      { mistake: 'Wrists bending', correction: 'Neutral wrists — grip the dumbbell tight.' },
    ],
    progression: 'barbell-curl',
    regression: null,
    default_sets: [3, 3],
    default_reps: [10, 12],
    default_rest_seconds: 45,
    tempo: null,
  },
  {
    slug: 'barbell-curl',
    name: 'Barbell Bicep Curl',
    category: 'pull',
    primary_muscles: ['biceps'],
    secondary_muscles: ['brachialis', 'forearms'],
    equipment: ['barbell'],
    difficulty: 'beginner',
    gif_url: GIF('barbell-curl'),
    posture_cues: [
      'Grip shoulder-width, palms up',
      'Elbows pinned; no hip swing',
      'Full range — bar to shoulder level',
    ],
    benefits: {
      physiological: ['Heavier loading than dumbbells — drives absolute strength'],
      aesthetic: ['Bicep peak and overall mass'],
      functional: ['Improves all curl variations'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Stand tall, bar at the hips, shoulder-width grip.' },
      { phase: 'concentric', instruction: 'Curl the bar up, elbows pinned to the sides.' },
      { phase: 'eccentric', instruction: 'Lower under control to a full arm-straight position.' },
    ],
    safety_warnings: ['If the bar causes wrist pain, use an EZ-bar instead.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Arm size grows; barbell load progresses'],
      red_flags: ['Elbow tendon pain — switch to dumbbells temporarily'],
    },
    common_mistakes: [
      { mistake: 'Swinging with hips', correction: 'Glutes squeezed; strict curls.' },
      { mistake: 'Partial range', correction: 'Full extension + full contraction.' },
      { mistake: 'Over-gripping', correction: 'Firm but relaxed grip.' },
    ],
    progression: null,
    regression: 'dumbbell-bicep-curl',
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 60,
    tempo: null,
  },
]
// ---------------------------------------------------------------------------
// Squat + Hinge + Carry
// ---------------------------------------------------------------------------

const lowerBody: Exercise[] = [
  {
    slug: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    category: 'squat',
    primary_muscles: ['quadriceps', 'glutes'],
    secondary_muscles: ['hamstrings', 'spinal erectors', 'core', 'adductors'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('barbell-back-squat'),
    posture_cues: [
      'Bar on upper traps (high bar) or rear delts (low bar) — never on the neck',
      'Feet shoulder-width, toes out 15-30°',
      'Brace core hard before unracking',
      'Break at hips and knees simultaneously; sit down and back',
      'Knees track over the toes — never collapse inward',
      'Drive through mid-foot; chest stays up',
    ],
    benefits: {
      physiological: [
        'Largest muscle groups in the body — high systemic hormonal response',
        'Builds lower-body strength and mass faster than any isolation alternative',
        'Bone density through axial loading',
      ],
      aesthetic: ['Develops quad sweep and glute shape', 'Thickens core and spinal erectors'],
      functional: [
        'Carries over to every lower-body athletic action',
        'Protects the lower back in daily life',
      ],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Position bar on upper back, grip outside shoulders, elbows down and tucked.',
      },
      {
        phase: 'setup',
        instruction: 'Unrack with both feet under, step back 2-3 small steps. Brace hard.',
      },
      {
        phase: 'eccentric',
        instruction: 'Break at hips AND knees together; descend under control.',
      },
      { phase: 'bottom', instruction: 'Hip crease drops below top of knee. No bounce.' },
      { phase: 'concentric', instruction: 'Drive mid-foot; hips and chest rise together.' },
      { phase: 'lockout', instruction: 'Stand tall, glutes squeezed, exhale. Reset brace.' },
    ],
    safety_warnings: [
      'ALWAYS use safety pins or spotter arms set just below your bottom depth',
      'Warm up with 2-3 progressively heavier sets before your top set',
      'Stop the set if form breaks — a failed clean rep is better than a grinded-out rep with lumbar flexion',
      'Max +2.5 kg/week unless two consecutive weeks ≥ 90% set completion',
    ],
    contraindications: [
      'Acute lower-back pain — substitute goblet squat or leg press',
      'Knee pain worsening with deep flexion — regress to box squat',
      'Shoulder mobility limiting bar placement — use safety squat bar or front squat',
    ],
    body_changes_to_watch: {
      green_flags: [
        'Quads and glutes work the day after — mild DOMS, not joint pain',
        'Core fatigue — bracing did its job',
        'Visible quad sweep and glute shape developing',
      ],
      red_flags: [
        'Sharp lower-back pain — STOP. Regress and re-examine bracing + depth',
        'Knee pain sharpening through warm-ups',
        'Persistent asymmetry one side to the other',
      ],
    },
    common_mistakes: [
      {
        mistake: 'Knees caving inward (valgus)',
        correction: '"Spread the floor" — actively push knees out. Reduce load if needed.',
      },
      {
        mistake: 'Hips rising faster than shoulders',
        correction: 'Pause at the bottom for 1 second; drive hips and chest up together.',
      },
      {
        mistake: 'Heels rising at the bottom',
        correction: 'Ankle mobility; weightlifting shoes with a raised heel.',
      },
      {
        mistake: 'Losing upper-back tightness',
        correction: 'Pull the bar DOWN into the traps before unracking.',
      },
      {
        mistake: 'Not hitting depth',
        correction: 'Film from the side; address ankle/hip mobility.',
      },
    ],
    progression: 'pause-squat',
    regression: 'goblet-squat',
    default_sets: [3, 4],
    default_reps: [5, 8],
    default_rest_seconds: 180,
    tempo: '3-1-1-0',
  },
  {
    slug: 'front-squat',
    name: 'Front Squat',
    category: 'squat',
    primary_muscles: ['quadriceps', 'core'],
    secondary_muscles: ['glutes', 'upper back'],
    equipment: ['barbell'],
    difficulty: 'advanced',
    gif_url: GIF('front-squat'),
    posture_cues: [
      'Bar rests on the front delts — elbows up high',
      'Fingers under the bar; light grip — the rack, not the grip, holds the bar',
      'Chest tall throughout; any forward lean = bar tips forward',
    ],
    benefits: {
      physiological: ['Emphasises quads over back squat', 'Tests upper-back and core stability'],
      aesthetic: ['Quad development'],
      functional: ['Carries over to any front-loaded activity'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Rack bar on the front delts; elbows high.' },
      { phase: 'eccentric', instruction: 'Squat down with a vertical torso — chest stays tall.' },
      { phase: 'bottom', instruction: 'Full depth; elbows still up.' },
      { phase: 'concentric', instruction: 'Drive up; do not let the elbows drop.' },
    ],
    safety_warnings: ['If the bar starts rolling off the shoulders — re-rack immediately.'],
    contraindications: ['Wrist mobility issues — use cross-arm rack or straps'],
    body_changes_to_watch: {
      green_flags: ['Back squat feels stronger; quads fill out'],
      red_flags: ['Bar drifting forward — core brace is losing'],
    },
    common_mistakes: [
      { mistake: 'Elbows dropping', correction: 'Cue "elbows up" every rep.' },
      { mistake: 'Forward lean', correction: 'Vertical torso — the front rack demands it.' },
      {
        mistake: 'Gripping the bar with the fingers instead of resting it',
        correction: 'The rack holds the bar; fingers are just a strap.',
      },
    ],
    progression: null,
    regression: 'barbell-back-squat',
    default_sets: [3, 3],
    default_reps: [5, 6],
    default_rest_seconds: 150,
    tempo: null,
  },
  {
    slug: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'squat',
    primary_muscles: ['quadriceps', 'glutes'],
    secondary_muscles: ['core', 'upper back'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    gif_url: GIF('goblet-squat'),
    posture_cues: [
      'Dumbbell or kettlebell held close to the chest',
      'Elbows drive knees out at the bottom',
      'Full depth — the position teaches the pattern',
    ],
    benefits: {
      physiological: ['Teaches the squat pattern with a counterweight that helps balance'],
      aesthetic: ['Quad and glute development'],
      functional: ['Foundational — builds to the barbell back squat'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Hold a dumbbell or kettlebell at the chest.' },
      {
        phase: 'eccentric',
        instruction: 'Descend to full depth — elbows can nudge the knees out.',
      },
      { phase: 'concentric', instruction: 'Stand up, glutes squeezed at the top.' },
    ],
    safety_warnings: ['Do not drop the load on the feet — set down with control.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Ready to graduate to the back squat'],
      red_flags: ['Knee pain — reduce range and load'],
    },
    common_mistakes: [
      {
        mistake: 'Dumbbell drifts away from the body',
        correction: 'Keep it at the chest throughout.',
      },
      {
        mistake: 'Half depth',
        correction: 'Full hip-crease-below-knee depth is the whole point of this lift.',
      },
      {
        mistake: 'Heels rising',
        correction: 'Work on ankle mobility; raise heels with plates if needed.',
      },
    ],
    progression: 'barbell-back-squat',
    regression: null,
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 75,
    tempo: '3-1-1-0',
  },
  {
    slug: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    category: 'squat',
    primary_muscles: ['quadriceps', 'glutes'],
    secondary_muscles: ['adductors', 'core'],
    equipment: ['dumbbell', 'bodyweight'],
    difficulty: 'intermediate',
    gif_url: GIF('bulgarian-split-squat'),
    posture_cues: [
      'Rear foot elevated on a bench; stance long enough that the front shin stays vertical-ish',
      'Front knee tracks over the toes',
      'Torso upright for quad emphasis; slight forward lean for glute emphasis',
    ],
    benefits: {
      physiological: ['Unilateral — addresses side-to-side imbalances'],
      aesthetic: ['Glute-ham development; evens out thigh size'],
      functional: ['Sport-transfer pattern — running and climbing stairs'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Set rear foot on a bench, front foot far enough forward for a vertical shin.',
      },
      {
        phase: 'eccentric',
        instruction: 'Lower under control until the back knee is just above the floor.',
      },
      { phase: 'concentric', instruction: 'Drive through the front mid-foot to stand up.' },
    ],
    safety_warnings: ['Do not crash the back knee into the floor — control the descent.'],
    contraindications: ['Acute knee issue'],
    body_changes_to_watch: {
      green_flags: ['Symmetry between legs improves'],
      red_flags: ['Front-knee pain — shorten stance and reduce load'],
    },
    common_mistakes: [
      {
        mistake: 'Stance too short',
        correction: 'Step the front foot further forward until the shin is vertical at the bottom.',
      },
      {
        mistake: 'Front knee collapsing inward',
        correction: 'Push the knee out over the 2nd and 3rd toes.',
      },
      {
        mistake: 'Bouncing the back knee off the floor',
        correction: 'Stop 1 inch above; control the reversal.',
      },
    ],
    progression: null,
    regression: 'goblet-squat',
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 90,
    tempo: null,
  },
  {
    slug: 'pause-squat',
    name: 'Pause Back Squat',
    category: 'squat',
    primary_muscles: ['quadriceps', 'glutes'],
    secondary_muscles: ['core', 'spinal erectors'],
    equipment: ['barbell'],
    difficulty: 'advanced',
    gif_url: GIF('pause-squat'),
    posture_cues: [
      'Standard back squat setup',
      '2-3 second pause at the bottom with maintained tightness',
      'No bounce — stand up from a dead stop',
    ],
    benefits: {
      physiological: ['Builds strength out of the hole; kills the bounce'],
      aesthetic: ['Quad development'],
      functional: ['Bulletproofs the bottom of the squat'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Same as back squat.' },
      {
        phase: 'bottom',
        instruction: 'Pause 2-3 seconds at full depth with all tightness maintained.',
      },
      { phase: 'concentric', instruction: 'Drive out of the hole; no bounce.' },
    ],
    safety_warnings: ['Reduce load 10-15% from your back squat working weight.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Regular back squat feels more stable and faster'],
      red_flags: ['Low-back rounding in the pause — reduce load and range'],
    },
    common_mistakes: [
      {
        mistake: 'Relaxing during the pause',
        correction: 'Stay tight — same brace as moving reps.',
      },
      { mistake: 'Bouncing', correction: 'Full stop, then drive.' },
      {
        mistake: 'Shortening the pause as fatigue sets in',
        correction: 'Count it; 2-3 seconds minimum.',
      },
    ],
    progression: null,
    regression: 'barbell-back-squat',
    default_sets: [3, 3],
    default_reps: [3, 5],
    default_rest_seconds: 180,
    tempo: '3-3-1-0',
  },
  {
    slug: 'conventional-deadlift',
    name: 'Conventional Deadlift',
    category: 'hinge',
    primary_muscles: ['hamstrings', 'glutes', 'spinal erectors'],
    secondary_muscles: ['lats', 'traps', 'grip'],
    equipment: ['barbell'],
    difficulty: 'advanced',
    gif_url: GIF('conventional-deadlift'),
    posture_cues: [
      'Bar over mid-foot, shins close to the bar',
      'Hips high enough to feel hamstring tension; shoulders just in front of bar',
      'Big breath, brace, then pull — bar drags up the legs',
      'Lockout: hips through; glutes squeezed; no hyperextension',
      'Return: push hips back first, then bend the knees',
    ],
    benefits: {
      physiological: ['Full-body strength builder — posterior chain, grip, core'],
      aesthetic: ['Back thickness and hamstring development'],
      functional: ['Most transferable lift for picking anything off the ground'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Bar over mid-foot; hinge, grip, take slack out of the bar.' },
      { phase: 'concentric', instruction: 'Push the floor away; bar drags up the shins.' },
      { phase: 'lockout', instruction: 'Stand tall, hips through, glutes squeezed.' },
      {
        phase: 'eccentric',
        instruction: 'Hinge first, then bend the knees — return bar to the floor.',
      },
    ],
    safety_warnings: [
      'Flat back — no rounding, ever',
      'Reset between reps; fatigue breaks form',
      'Max +2.5 kg/week; do not chase PRs when fatigued',
    ],
    contraindications: ['Acute lower-back issue — substitute trap bar or RDL until cleared'],
    body_changes_to_watch: {
      green_flags: ['Posterior chain fills out; grip carries over to other lifts'],
      red_flags: ['Lower-back pain — film next session; likely rounding'],
    },
    common_mistakes: [
      { mistake: 'Hips shooting up first', correction: 'Hips and shoulders rise together.' },
      { mistake: 'Bar drifting forward', correction: 'Lats engaged; bar stays against the body.' },
      { mistake: 'Hyperextending at lockout', correction: 'Stand tall — do not lean back.' },
      {
        mistake: 'Dropping the bar from lockout',
        correction: 'Control the eccentric — hinge back.',
      },
    ],
    progression: null,
    regression: 'trap-bar-deadlift',
    default_sets: [3, 3],
    default_reps: [3, 5],
    default_rest_seconds: 180,
    tempo: null,
  },
  {
    slug: 'romanian-deadlift',
    name: 'Romanian Deadlift (RDL)',
    category: 'hinge',
    primary_muscles: ['hamstrings', 'glutes'],
    secondary_muscles: ['spinal erectors', 'lats'],
    equipment: ['barbell', 'dumbbell'],
    difficulty: 'intermediate',
    gif_url: GIF('romanian-deadlift'),
    posture_cues: [
      'Slight knee bend — then keep it constant',
      'Push hips back; bar slides down the thighs',
      'Descend until hamstrings say "enough" — usually just below the knees',
      'Drive hips forward to stand up',
    ],
    benefits: {
      physiological: ['Direct hamstring and glute hypertrophy via the hinge'],
      aesthetic: ['Glute-ham tie-in — major posterior-chain development'],
      functional: ['Teaches the hinge that protects the lower back in life'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Bar at the hips, shoulder-width grip, slight knee bend.' },
      {
        phase: 'eccentric',
        instruction: 'Push hips back; bar descends the thighs. Stop where hamstrings tighten.',
      },
      {
        phase: 'concentric',
        instruction: 'Drive hips forward to stand; glutes squeeze at the top.',
      },
    ],
    safety_warnings: ['Do not round the lower back to get extra range', 'Max +2.5 kg/week'],
    contraindications: ['Acute lower-back pain'],
    body_changes_to_watch: {
      green_flags: ['Hamstring and glute thickness grow', 'Deadlift lockout feels stronger'],
      red_flags: ['Lower-back pain — stop; you are rounding'],
    },
    common_mistakes: [
      {
        mistake: 'Bending the knees too much — turning it into a deadlift',
        correction: 'Small knee bend; HOLD it throughout.',
      },
      {
        mistake: 'Bar drifting away from body',
        correction: 'Think "shave the legs" with the bar.',
      },
      {
        mistake: 'Rounding the back for range',
        correction: 'Stop where hamstrings are fully stretched with a neutral spine.',
      },
    ],
    progression: 'conventional-deadlift',
    regression: 'hip-thrust',
    default_sets: [3, 3],
    default_reps: [6, 10],
    default_rest_seconds: 120,
    tempo: '3-0-1-0',
  },
  {
    slug: 'trap-bar-deadlift',
    name: 'Trap Bar Deadlift',
    category: 'hinge',
    primary_muscles: ['quadriceps', 'glutes', 'hamstrings'],
    secondary_muscles: ['traps', 'spinal erectors', 'grip'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    gif_url: GIF('trap-bar-deadlift'),
    posture_cues: [
      'Stand inside the hex/trap bar',
      'Hinge, neutral grip at the handles',
      'Push the floor away — drive with the legs',
      'Stand tall; control the lowering',
    ],
    benefits: {
      physiological: [
        'Hinge variant that distributes load more evenly between quads and posterior chain',
        'Easier to keep a neutral back than conventional',
      ],
      aesthetic: ['Full lower-body and trap development'],
      functional: ['Approachable for returning lifters and people with finicky low backs'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Stand inside the trap bar; hinge and grip the handles.' },
      { phase: 'concentric', instruction: 'Push the floor away; stand up with a tall chest.' },
      { phase: 'eccentric', instruction: 'Hinge and return to the floor with control.' },
    ],
    safety_warnings: ['Keep the bar close to the body — trap bar forgives, but not forever.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Whole body feels stronger; regular deadlift progresses'],
      red_flags: ['Low-back pain — reduce load and review brace'],
    },
    common_mistakes: [
      {
        mistake: 'Squatting the bar up',
        correction: 'Hinge the hips back first; feel hamstrings before you pull.',
      },
      { mistake: 'Leaning forward', correction: 'Chest tall throughout.' },
      {
        mistake: 'Dropping the bar',
        correction: 'Control the lowering — earns eccentric strength.',
      },
    ],
    progression: 'conventional-deadlift',
    regression: 'romanian-deadlift',
    default_sets: [3, 3],
    default_reps: [5, 6],
    default_rest_seconds: 150,
    tempo: null,
  },
  {
    slug: 'kettlebell-swing',
    name: 'Kettlebell Swing (Hip Hinge)',
    category: 'hinge',
    primary_muscles: ['glutes', 'hamstrings'],
    secondary_muscles: ['lats', 'core'],
    equipment: ['kettlebell'],
    difficulty: 'beginner',
    gif_url: GIF('kettlebell-swing'),
    posture_cues: [
      'Hinge — not a squat',
      'Kettlebell swings from the hips; arms are ropes',
      'Hard snap at the top — glutes SQUEEZE',
      'Bell floats between the legs; hike it back aggressively',
    ],
    benefits: {
      physiological: ['Powerful hip extension — best single drill for power endurance'],
      aesthetic: ['Glute development'],
      functional: ['Conditioning + strength hybrid — carries to everything'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Kettlebell 2-3 feet in front; hinge, grab with two hands.' },
      {
        phase: 'eccentric',
        instruction: 'Hike the bell back between the legs — hinge aggressively.',
      },
      { phase: 'concentric', instruction: 'Snap the hips; bell floats to chest height.' },
      { phase: 'lockout', instruction: 'Tall plank at the top; glutes squeezed.' },
    ],
    safety_warnings: [
      'Do not squat the swing — it is a hinge. Bell does NOT go to shoulder height.',
    ],
    contraindications: ['Acute low-back pain'],
    body_changes_to_watch: {
      green_flags: ['Glutes fill out; conditioning improves'],
      red_flags: ['Low-back pain — likely squatting the swing; film next set'],
    },
    common_mistakes: [
      {
        mistake: 'Using the arms to lift the bell',
        correction: 'Arms are ropes; hips do all the work.',
      },
      {
        mistake: 'Swinging overhead (American swing)',
        correction: 'Chest height is the cap — it is enough.',
      },
      {
        mistake: 'Squatting the bell',
        correction: 'Hinge only; small knee bend at the top of the swing.',
      },
    ],
    progression: null,
    regression: 'glute-bridge',
    default_sets: [3, 4],
    default_reps: [15, 20],
    default_rest_seconds: 60,
    tempo: null,
  },
  {
    slug: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    category: 'hinge',
    primary_muscles: ['glutes'],
    secondary_muscles: ['hamstrings'],
    equipment: ['barbell'],
    difficulty: 'beginner',
    gif_url: GIF('hip-thrust'),
    posture_cues: [
      'Upper back on a bench; bar over the hips with a pad',
      'Feet flat; knees about 90° at the top',
      'Squeeze glutes at full hip extension; ribs down',
    ],
    benefits: {
      physiological: ['Heavy direct glute loading'],
      aesthetic: ['Glute development — unmatched for this muscle'],
      functional: ['Carries to deadlift and squat power'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Upper back on bench; bar with pad across the hip crease.' },
      { phase: 'concentric', instruction: 'Drive hips up; knees end ~90°; squeeze glutes.' },
      { phase: 'eccentric', instruction: 'Lower under control just off the floor.' },
    ],
    safety_warnings: ['Use a bar pad — the bar on bare hip is unpleasant.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Glutes fill out; deadlift lockout improves'],
      red_flags: ['Lower-back pain — ribs up means lumbar extension; keep ribs down'],
    },
    common_mistakes: [
      {
        mistake: 'Hyperextending the lumbar at the top',
        correction: 'Tuck ribs and pelvis; glutes create the extension.',
      },
      { mistake: 'Too much weight — reduced range', correction: 'Reduce load; full range.' },
      {
        mistake: 'Feet too far forward',
        correction: 'Knees at ~90° at the top means feet adjust accordingly.',
      },
    ],
    progression: null,
    regression: 'glute-bridge',
    default_sets: [3, 3],
    default_reps: [8, 12],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'farmers-carry',
    name: "Farmer's Carry",
    category: 'carry',
    primary_muscles: ['grip', 'traps', 'core'],
    secondary_muscles: ['glutes', 'forearms'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    gif_url: GIF('farmers-carry'),
    posture_cues: [
      'Tall posture — ribs over hips',
      'Shoulders packed down, not shrugged',
      'Short steps; controlled cadence',
    ],
    benefits: {
      physiological: ['Full-body strength — grip, trunk, postural'],
      aesthetic: ['Trap and forearm development'],
      functional: ['Direct transfer to every real-world carry'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Stand between two heavy dumbbells; hinge, grip both, stand up tall.',
      },
      { phase: 'concentric', instruction: 'Walk a set distance — short, controlled steps.' },
      { phase: 'lockout', instruction: 'Set down with a controlled hinge.' },
    ],
    safety_warnings: ['Do not drop the weights from standing — hinge to the floor.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Grip improves in every other lift'],
      red_flags: ['Trap pain — likely shrugged up; pack shoulders down'],
    },
    common_mistakes: [
      { mistake: 'Shrugging up', correction: 'Pack shoulders down; long neck.' },
      { mistake: 'Leaning side to side', correction: 'Tall through the spine.' },
      { mistake: 'Dropping at the end', correction: 'Hinge down with the weight under control.' },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 3],
    default_reps: [30, 45],
    default_rest_seconds: 60,
    tempo: null,
  },
  {
    slug: 'sled-push',
    name: 'Sled Push',
    category: 'carry',
    primary_muscles: ['quadriceps', 'glutes', 'calves'],
    secondary_muscles: ['core'],
    equipment: ['sled'],
    difficulty: 'beginner',
    gif_url: GIF('sled-push'),
    posture_cues: [
      'Low body angle — drive through the legs, not the arms',
      'Stride long; hip extends fully each step',
      'Core braced; no twisting',
    ],
    benefits: {
      physiological: ['Zero eccentric — build leg strength without recovery cost'],
      aesthetic: ['Leg and glute hypertrophy'],
      functional: ['Sprint-transfer leg drive'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Load sled; grip the handles; body at a low angle.' },
      { phase: 'concentric', instruction: 'Drive through the legs; push the sled 20-30 meters.' },
      { phase: 'lockout', instruction: 'Stop at the end; rest; repeat.' },
    ],
    safety_warnings: ['Calf cramps are common — warm up the lower legs first.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Leg conditioning improves; sprint speed feels stronger'],
      red_flags: ['Calf pain — stop and stretch'],
    },
    common_mistakes: [
      { mistake: 'Body upright', correction: 'Low angle; drive through the legs.' },
      { mistake: 'Short chopped steps', correction: 'Long strides; full hip extension.' },
      { mistake: 'Twisting torso', correction: 'Square hips and shoulders.' },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 4],
    default_reps: [1, 1],
    default_rest_seconds: 60,
    tempo: null,
  },
]
// ---------------------------------------------------------------------------
// Core + conditioning
// ---------------------------------------------------------------------------

const core: Exercise[] = [
  {
    slug: 'plank',
    name: 'Front Plank',
    category: 'core',
    primary_muscles: ['abdominals', 'obliques'],
    secondary_muscles: ['glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('plank'),
    posture_cues: [
      'Forearms under shoulders; body in a straight line',
      'Squeeze glutes; ribs down',
      'Breathe — do not hold the breath',
    ],
    benefits: {
      physiological: ['Teaches anti-extension bracing used in every big lift'],
      aesthetic: ['Ab visibility as fat drops'],
      functional: ['Spine-friendly core work'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Forearms on the floor under the shoulders; body in a straight line.',
      },
      { phase: 'concentric', instruction: 'Squeeze glutes, brace the abs; hold the position.' },
      { phase: 'lockout', instruction: 'Come down under control.' },
    ],
    safety_warnings: ['If the low back sags, reduce hold time or elevate forearms on a bench.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Longer holds with no form break; bigger lifts feel more braced'],
      red_flags: ['Lower-back pain — form is breaking; shorten the hold'],
    },
    common_mistakes: [
      { mistake: 'Hips sagging', correction: 'Glutes squeezed; ribs down.' },
      {
        mistake: 'Butt in the air',
        correction: 'Body in a straight line from ankles to shoulders.',
      },
      { mistake: 'Holding the breath', correction: 'Slow nasal breathing throughout.' },
    ],
    progression: 'side-plank',
    regression: null,
    default_sets: [3, 3],
    default_reps: [30, 60],
    default_rest_seconds: 45,
    tempo: null,
  },
  {
    slug: 'side-plank',
    name: 'Side Plank',
    category: 'core',
    primary_muscles: ['obliques', 'quadratus lumborum'],
    secondary_muscles: ['glute medius'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('side-plank'),
    posture_cues: [
      'Forearm under the shoulder',
      'Body straight from head to feet; hips lifted',
      'Top hand on the hip or reaching to the ceiling',
    ],
    benefits: {
      physiological: ['Anti-lateral-flexion core strength'],
      aesthetic: ['Oblique visibility'],
      functional: ['Prevents the lateral-shift deadlift / squat weakness'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Lie on your side, forearm under the shoulder.' },
      { phase: 'concentric', instruction: 'Lift the hips; body in a straight line.' },
      { phase: 'lockout', instruction: 'Hold; come down under control; switch sides.' },
    ],
    safety_warnings: [
      'If shoulder pain arises — drop the knee to the floor for a regressed version.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Hip stability in split-squat improves'],
      red_flags: ['Shoulder pain — regress to knee-down or stop'],
    },
    common_mistakes: [
      { mistake: 'Hips sagging', correction: 'Lift hips high; squeeze glutes.' },
      { mistake: 'Elbow too far forward', correction: 'Stack elbow under shoulder.' },
      {
        mistake: 'Rolling backward',
        correction: 'Stack hips and shoulders in one vertical plane.',
      },
    ],
    progression: null,
    regression: 'plank',
    default_sets: [3, 3],
    default_reps: [20, 45],
    default_rest_seconds: 30,
    tempo: null,
  },
  {
    slug: 'dead-bug',
    name: 'Dead Bug',
    category: 'core',
    primary_muscles: ['abdominals'],
    secondary_muscles: ['hip flexors'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('dead-bug'),
    posture_cues: [
      'Low back pressed into the floor',
      'Opposite arm + opposite leg extend together, slowly',
      'Breathe out as you extend',
    ],
    benefits: {
      physiological: ['Teaches core-bracing under rotational challenge'],
      aesthetic: ['Ab definition as fat drops'],
      functional: ['Spine-friendly ab work that supports heavy lifts'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Lie on back; arms up, hips and knees at 90°.' },
      {
        phase: 'concentric',
        instruction: 'Extend opposite arm and opposite leg slowly; low back stays flush.',
      },
      { phase: 'eccentric', instruction: 'Return; repeat on the other side.' },
    ],
    safety_warnings: ['If the low back arches off the floor — shorten the range.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Heavier lifts feel more braced'],
      red_flags: ['Low-back pain — form broke; shorten range'],
    },
    common_mistakes: [
      {
        mistake: 'Low back arching off the floor',
        correction: 'Press the low back down throughout.',
      },
      { mistake: 'Moving too fast', correction: '3 seconds out, 3 seconds back.' },
      { mistake: 'Holding the breath', correction: 'Exhale as you extend.' },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 3],
    default_reps: [8, 10],
    default_rest_seconds: 45,
    tempo: '3-0-3-0',
  },
  {
    slug: 'hanging-knee-raise',
    name: 'Hanging Knee Raise',
    category: 'core',
    primary_muscles: ['abdominals', 'hip flexors'],
    secondary_muscles: ['grip', 'lats'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    gif_url: GIF('hanging-knee-raise'),
    posture_cues: [
      'Active hang — lats engaged',
      'Tuck knees to the chest, not just lifted to 90°',
      'Control the lowering — do not swing',
    ],
    benefits: {
      physiological: ['Direct abdominal flexion under load'],
      aesthetic: ['Ab development'],
      functional: ['Grip + core combined'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Hang from a pull-up bar with an active hang.' },
      { phase: 'concentric', instruction: 'Tuck knees to the chest.' },
      { phase: 'eccentric', instruction: 'Lower under control; no swing.' },
    ],
    safety_warnings: ['If grip fails before abs — use lifting straps to isolate the abs.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Ready for hanging leg raise'],
      red_flags: ['Hip flexor dominating — use the posterior tilt cue'],
    },
    common_mistakes: [
      { mistake: 'Swinging', correction: 'Strict reps only.' },
      { mistake: 'Half range', correction: 'Knees reach the chest.' },
      {
        mistake: 'Hip flexor doing the work',
        correction: 'Cue "tuck the pelvis" first; then knees rise.',
      },
    ],
    progression: 'hanging-leg-raise',
    regression: null,
    default_sets: [3, 3],
    default_reps: [8, 12],
    default_rest_seconds: 60,
    tempo: null,
  },
  {
    slug: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    primary_muscles: ['abdominals'],
    secondary_muscles: ['hip flexors', 'grip'],
    equipment: ['bodyweight'],
    difficulty: 'advanced',
    gif_url: GIF('hanging-leg-raise'),
    posture_cues: [
      'Active hang; posterior pelvic tilt FIRST',
      'Legs rise to parallel or above — straight',
      'Lower under control; no swing',
    ],
    benefits: {
      physiological: ['Advanced abdominal loading'],
      aesthetic: ['Ab + obliques development'],
      functional: ['Grip + core'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Active hang from a pull-up bar.' },
      {
        phase: 'concentric',
        instruction: 'Tuck pelvis; raise straight legs to or above parallel.',
      },
      { phase: 'eccentric', instruction: 'Lower under control.' },
    ],
    safety_warnings: ['Use straps if grip fatigues before abs.'],
    contraindications: ['Acute lower-back pain'],
    body_changes_to_watch: {
      green_flags: ['Lower-ab visibility emerges'],
      red_flags: ['Low-back pain — working from the hip flexor, not the abs'],
    },
    common_mistakes: [
      { mistake: 'Skipping the pelvic tilt', correction: 'Tuck pelvis first; then raise.' },
      { mistake: 'Swinging', correction: 'Strict reps.' },
      { mistake: 'Partial range', correction: 'At least parallel to the floor.' },
    ],
    progression: null,
    regression: 'hanging-knee-raise',
    default_sets: [3, 4],
    default_reps: [5, 10],
    default_rest_seconds: 75,
    tempo: null,
  },
  {
    slug: 'cable-crunch',
    name: 'Cable Crunch',
    category: 'core',
    primary_muscles: ['abdominals'],
    secondary_muscles: [],
    equipment: ['cable'],
    difficulty: 'beginner',
    gif_url: GIF('cable-crunch'),
    posture_cues: [
      'Kneel below a high cable; rope at the forehead',
      'Crunch down — spine flexes, not hip hinge',
      'Elbows track toward the thighs',
    ],
    benefits: {
      physiological: ['Direct abdominal flexion under load'],
      aesthetic: ['Six-pack development'],
      functional: ['Easy to progress; cleanly loads the abs'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Kneel below a high cable; rope attachment at the forehead.' },
      { phase: 'concentric', instruction: 'Crunch down — flex the spine; elbows to the thighs.' },
      { phase: 'eccentric', instruction: 'Return under control.' },
    ],
    safety_warnings: ['Do not use the hips to pull the weight — the abs flex the spine.'],
    contraindications: ['Acute disc issue in flexion'],
    body_changes_to_watch: {
      green_flags: ['Ab thickness develops'],
      red_flags: ['Low-back pain — reduce range'],
    },
    common_mistakes: [
      { mistake: 'Hip-hinging', correction: 'Hips stay fixed; spine flexes.' },
      {
        mistake: 'Hands pulling the rope',
        correction: 'Rope anchored at the forehead; abs do the work.',
      },
      { mistake: 'Half range', correction: 'Full crunch down; full stretch up.' },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 4],
    default_reps: [10, 12],
    default_rest_seconds: 45,
    tempo: null,
  },
  {
    slug: 'pallof-press',
    name: 'Pallof Press',
    category: 'core',
    primary_muscles: ['obliques', 'abdominals'],
    secondary_muscles: ['glutes', 'deep core'],
    equipment: ['cable', 'band'],
    difficulty: 'beginner',
    gif_url: GIF('pallof-press'),
    posture_cues: [
      'Cable or band at chest height, perpendicular to the body',
      'Press out straight; resist the rotation the cable pulls you into',
      'Ribs down; pelvis neutral',
    ],
    benefits: {
      physiological: ['Anti-rotation core strength'],
      aesthetic: ['Oblique visibility'],
      functional: ['Bulletproofs the core against rotation in sport and life'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Stand perpendicular to the cable; hands at the sternum.' },
      { phase: 'concentric', instruction: 'Press hands straight out; resist the rotation.' },
      { phase: 'eccentric', instruction: 'Return to the sternum under control.' },
    ],
    safety_warnings: [
      'Pick a weight that lets you stay stacked — if you are being pulled, go lighter.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Lifts feel more stable; less low-back tension'],
      red_flags: ['Low-back pain — load too heavy; form breaking'],
    },
    common_mistakes: [
      { mistake: 'Letting the torso twist', correction: 'Glutes braced; shoulders square.' },
      { mistake: 'Arching the low back', correction: 'Ribs down; pelvis neutral.' },
      {
        mistake: 'Using too much weight',
        correction: 'Lighter load with clean form beats heavy load with lean.',
      },
    ],
    progression: null,
    regression: null,
    default_sets: [3, 3],
    default_reps: [10, 12],
    default_rest_seconds: 45,
    tempo: null,
  },
  {
    slug: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    category: 'core',
    primary_muscles: ['abdominals', 'lats'],
    secondary_muscles: ['shoulders', 'serratus'],
    equipment: ['machine', 'bodyweight'],
    difficulty: 'advanced',
    gif_url: GIF('ab-wheel-rollout'),
    posture_cues: [
      'Knees on the floor (regressed) or feet (advanced)',
      'Tuck pelvis HARD — do not let the low back sag',
      'Roll out only as far as you can maintain the tuck',
    ],
    benefits: {
      physiological: ['Highest-demand anti-extension exercise'],
      aesthetic: ['Ab development'],
      functional: ['Supports heavy pressing and squatting'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Kneel behind the ab wheel; grip the handles.' },
      { phase: 'eccentric', instruction: 'Roll forward slowly; pelvis stays tucked.' },
      { phase: 'concentric', instruction: 'Pull the wheel back under control.' },
    ],
    safety_warnings: [
      'Do not overshoot — if the low back arches, you went too far',
      'Build range over weeks',
    ],
    contraindications: ['Acute disc issue in extension'],
    body_changes_to_watch: {
      green_flags: ['Rollout distance grows; heavy lifts feel more stable'],
      red_flags: ['Low-back soreness — shorten range'],
    },
    common_mistakes: [
      { mistake: 'Low-back arching at the bottom', correction: 'Shorten range; rebuild the tuck.' },
      { mistake: 'Going too fast', correction: 'Slow, controlled descent.' },
      { mistake: 'Shoulders shrugging', correction: 'Lats engaged; shoulders packed down.' },
    ],
    progression: null,
    regression: 'plank',
    default_sets: [3, 3],
    default_reps: [6, 10],
    default_rest_seconds: 60,
    tempo: null,
  },
]

const conditioning: Exercise[] = [
  {
    slug: 'assault-bike-intervals',
    name: 'Assault Bike Intervals',
    category: 'conditioning',
    primary_muscles: ['quadriceps', 'glutes', 'shoulders'],
    secondary_muscles: ['core', 'lats'],
    equipment: ['assault_bike'],
    difficulty: 'intermediate',
    gif_url: GIF('assault-bike-intervals'),
    posture_cues: [
      'Neutral spine; do not hunch over the handles',
      'Hard drive with arms + legs — this is whole-body',
      'Breathe — nasal when you can, mouth when you must',
    ],
    benefits: {
      physiological: ['Extreme cardiovascular demand without impact'],
      aesthetic: ['Conditioning leans out the face as fat drops'],
      functional: ['Builds work capacity that transfers to every physical activity'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Warm up 3 minutes at an easy pace.' },
      {
        phase: 'concentric',
        instruction: 'Work intervals: 20s hard / 40s easy × 10 or per session prescription.',
      },
      { phase: 'lockout', instruction: 'Cool down 2 minutes easy; stretch hip flexors after.' },
    ],
    safety_warnings: [
      'Blood pressure spikes on this machine — if you feel dizzy, slow down immediately.',
    ],
    contraindications: ['Uncontrolled hypertension'],
    body_changes_to_watch: {
      green_flags: ['Recovery between intervals gets faster', 'Resting HR drops'],
      red_flags: ['Dizziness, chest pain — STOP'],
    },
    common_mistakes: [
      {
        mistake: 'Pacing the work interval too easy',
        correction: 'If you can hold a conversation, go harder.',
      },
      { mistake: 'Using only legs', correction: 'Arms drive too — whole body.' },
      {
        mistake: 'Skipping the cool-down',
        correction: 'Two minutes easy prevents next-day heaviness.',
      },
    ],
    progression: null,
    regression: 'treadmill-intervals',
    default_sets: [1, 1],
    default_reps: [10, 12],
    default_rest_seconds: 40,
    tempo: null,
  },
  {
    slug: 'treadmill-intervals',
    name: 'Treadmill Intervals',
    category: 'conditioning',
    primary_muscles: ['quadriceps', 'glutes', 'calves'],
    secondary_muscles: ['core'],
    equipment: ['treadmill'],
    difficulty: 'beginner',
    gif_url: GIF('treadmill-intervals'),
    posture_cues: [
      'Upright posture — do not hunch over the console',
      'Short ground contact time — light on the feet',
      'Arms move forward and back, not across the body',
    ],
    benefits: {
      physiological: ['Aerobic + anaerobic development in one session'],
      aesthetic: ['Conditioning supports full-body fat loss'],
      functional: ['Progresses cardio capacity beyond steady-state'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Warm up 3-5 minutes at an easy pace.' },
      {
        phase: 'concentric',
        instruction: 'Alternate hard (1 min) with easy (2 min) for 6-8 rounds.',
      },
      { phase: 'lockout', instruction: 'Cool down 3 minutes walking.' },
    ],
    safety_warnings: ['Straddle the belt to change speed — do not leap onto a moving belt.'],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Work-interval pace rises at the same perceived effort', 'Resting HR drops'],
      red_flags: ['Shin pain — switch to a softer modality briefly'],
    },
    common_mistakes: [
      {
        mistake: 'Gripping the handles the whole run',
        correction: 'Handles only for balance; arms swing naturally.',
      },
      { mistake: 'Ramping speed too aggressively', correction: 'Build by 0.2-0.5 km/h per week.' },
      {
        mistake: 'Skipping the cool-down',
        correction: 'Walk 3 minutes to bring HR down gradually.',
      },
    ],
    progression: null,
    regression: 'treadmill-steady-state',
    default_sets: [1, 1],
    default_reps: [8, 8],
    default_rest_seconds: 120,
    tempo: null,
  },
  {
    slug: 'treadmill-steady-state',
    name: 'Treadmill Steady-State',
    category: 'conditioning',
    primary_muscles: ['quadriceps', 'calves'],
    secondary_muscles: ['glutes'],
    equipment: ['treadmill'],
    difficulty: 'beginner',
    gif_url: GIF('treadmill-steady-state'),
    posture_cues: [
      'Upright posture',
      'Short, light ground contact',
      'RPE 5 — full sentences possible',
    ],
    benefits: {
      physiological: ['Aerobic base building'],
      aesthetic: ['Supports fat loss without taxing recovery'],
      functional: ['Low-impact option for building cardio capacity'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Warm up 3 minutes easy.' },
      {
        phase: 'concentric',
        instruction: 'Maintain steady pace at RPE 5 for the prescribed duration.',
      },
      { phase: 'lockout', instruction: 'Cool down 2-3 minutes walking.' },
    ],
    safety_warnings: [
      'Hydrate — 40 minutes of steady-state fasted depletes water faster than you think.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Same pace, lower HR over weeks'],
      red_flags: ['Chronic fatigue — volume too high'],
    },
    common_mistakes: [
      {
        mistake: 'Going too hard and calling it steady',
        correction: 'RPE 5 — you should be able to talk in full sentences.',
      },
      { mistake: 'Skipping warm-up', correction: '3 minutes easy before the main block.' },
      { mistake: 'No hydration', correction: 'Water before and after — 300-500 ml each.' },
    ],
    progression: 'treadmill-intervals',
    regression: null,
    default_sets: [1, 1],
    default_reps: [1, 1],
    default_rest_seconds: 0,
    tempo: null,
  },
  {
    slug: 'rowing-intervals',
    name: 'Rowing Intervals',
    category: 'conditioning',
    primary_muscles: ['lats', 'quadriceps', 'glutes'],
    secondary_muscles: ['mid back', 'core'],
    equipment: ['rower'],
    difficulty: 'intermediate',
    gif_url: GIF('rowing-intervals'),
    posture_cues: [
      'Legs → back → arms on the drive; arms → back → legs on the recovery',
      'Neutral spine throughout; do not yank with the low back',
      'Finish with a short, sharp pull — do not over-lean back',
    ],
    benefits: {
      physiological: ['Full-body cardio with huge posterior chain engagement'],
      aesthetic: ['Back + leg development supported'],
      functional: ['Low-impact intense conditioning'],
    },
    movement_steps: [
      { phase: 'setup', instruction: 'Strap feet; sit tall; catch position with shins vertical.' },
      { phase: 'concentric', instruction: 'Drive legs, lean back, pull arms.' },
      { phase: 'eccentric', instruction: 'Recover arms, fold forward, slide up the rail.' },
    ],
    safety_warnings: ['Do not jerk the chain at the catch — smooth acceleration.'],
    contraindications: ['Acute lower-back pain'],
    body_changes_to_watch: {
      green_flags: ['500m split time improves', 'Back and hamstrings feel stronger'],
      red_flags: ['Lower-back pain — form check needed'],
    },
    common_mistakes: [
      { mistake: 'Arms-first on the drive', correction: 'Legs drive first; arms pull last.' },
      {
        mistake: 'Shooting the slide',
        correction: 'Slow the recovery; match the drive-to-recovery 1:2 ratio.',
      },
      { mistake: 'Rounding the back', correction: 'Neutral spine; hinge from the hips.' },
    ],
    progression: null,
    regression: 'treadmill-steady-state',
    default_sets: [1, 1],
    default_reps: [5, 5],
    default_rest_seconds: 90,
    tempo: null,
  },
  {
    slug: 'kettlebell-complex',
    name: 'Kettlebell Complex (Swing + Goblet Squat + Push-up)',
    category: 'conditioning',
    primary_muscles: ['glutes', 'quadriceps', 'pectorals'],
    secondary_muscles: ['core', 'shoulders'],
    equipment: ['kettlebell'],
    difficulty: 'intermediate',
    gif_url: GIF('kettlebell-complex'),
    posture_cues: [
      'Pick a moderate bell — technique over load',
      'Flow — do not rest between movements inside a round',
      'Rest between rounds, not between reps',
    ],
    benefits: {
      physiological: ['Full-body metabolic demand with strength component'],
      aesthetic: ['Calorie burn with muscle preservation'],
      functional: ['Mimics real-world sustained work'],
    },
    movement_steps: [
      {
        phase: 'setup',
        instruction: 'Choose one kettlebell; warm up the hinge and squat patterns.',
      },
      {
        phase: 'concentric',
        instruction: '10 KB swings → 10 goblet squats → 5 push-ups; that is 1 round.',
      },
      { phase: 'lockout', instruction: 'Rest 60-90 seconds; repeat for 3-5 rounds.' },
    ],
    safety_warnings: [
      'If form degrades mid-round — drop a rep; do not muscle through broken positions.',
    ],
    contraindications: [],
    body_changes_to_watch: {
      green_flags: ['Rounds get easier at the same load'],
      red_flags: ['Lower-back pain — likely from a loose swing'],
    },
    common_mistakes: [
      {
        mistake: 'Rushing between moves to force a fast time',
        correction: 'Prioritize clean positions — intensity is the output, not the input.',
      },
      { mistake: 'Using a bell too heavy', correction: 'Start light; form is the whole point.' },
      { mistake: 'No rest between rounds', correction: '60-90 seconds rest preserves quality.' },
    ],
    progression: null,
    regression: 'kettlebell-swing',
    default_sets: [3, 5],
    default_reps: [1, 1],
    default_rest_seconds: 90,
    tempo: null,
  },
]

// ---------------------------------------------------------------------------
// Exported library
// ---------------------------------------------------------------------------

export const exerciseLibrary: ReadonlyArray<Exercise> = [
  ...warmups,
  ...mobility,
  ...push,
  ...pull,
  ...lowerBody,
  ...core,
  ...conditioning,
]
