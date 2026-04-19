/**
 * Phase templates — the blueprints that drive `generatePlan`.
 *
 * Everything in this file is pure data + pure functions. No I/O.
 *
 * The algorithm (`generator.ts`) applies these templates to a user profile and
 * produces a concrete 90-day `Plan`. The separation lets us unit-test the
 * templates independently from the generator's glue code.
 *
 * Source: docs/specs/plan-generator-spec.md.
 */
import type { CardioBlock, MobilityBlock, PhaseName, WarmupBlock } from '@/domain/plan'

// ---------------------------------------------------------------------------
// Exercise slot blueprint
// ---------------------------------------------------------------------------

export type ExerciseRole =
  | 'main-compound-lower'
  | 'main-compound-upper'
  | 'secondary'
  | 'accessory'
  | 'core'
  | 'mobility'
  | 'warmup'

export type ExerciseSlot = {
  slug: string
  role: ExerciseRole
  sets: number
  repsMin: number
  repsMax: number
  restSeconds: number
  tempo: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Session blueprint
// ---------------------------------------------------------------------------

export type SessionBlueprint = {
  name: string
  type: 'strength' | 'conditioning' | 'hybrid' | 'rest'
  exercises: ExerciseSlot[]
  cardio: CardioBlock | null
  /** When non-null, used verbatim. When null, generator skips warmup
   * (rest / mobility-only days). */
  warmup: WarmupBlock | null
  mobility: MobilityBlock | null
}

// ---------------------------------------------------------------------------
// Canonical blocks (warmup + mobility + conditioning) reused across phases
// ---------------------------------------------------------------------------

/** 5-8 minute dynamic warm-up — mandatory by policy before any strength work. */
export const STANDARD_WARMUP: WarmupBlock = {
  durationMinutes: 6,
  exerciseSlugs: [
    'worlds-greatest-stretch',
    'cat-cow',
    'scapular-push-ups',
    'hip-90-90',
    'band-pull-apart',
    'leg-swings',
  ],
  mandatory: true,
}

const MOBILITY_UPPER: MobilityBlock = {
  durationMinutes: 5,
  exerciseSlugs: ['thoracic-rotation-quadruped', 'wall-slides', 'neck-retraction'],
}

const MOBILITY_LOWER: MobilityBlock = {
  durationMinutes: 5,
  exerciseSlugs: ['couch-stretch', 'pigeon-pose', 'hip-90-90'],
}

const MOBILITY_POSTURE: MobilityBlock = {
  durationMinutes: 5,
  exerciseSlugs: ['wall-slides', 'neck-retraction', 'dead-hang'],
}

const CARDIO_STEADY_STATE: CardioBlock = {
  modality: 'treadmill',
  kind: 'steady_state',
  prescription: '40 min @ 6 km/h, incline 1, RPE 5 (full sentences possible)',
  targetRpe: 5,
  targetDurationMinutes: 40,
}

const CARDIO_INTERVALS_TREADMILL: CardioBlock = {
  modality: 'treadmill',
  kind: 'intervals',
  prescription: '8 × (1 min @ 8 km/h incline 2 / 2 min @ 5 km/h), RPE 7 during work',
  targetRpe: 7,
  targetDurationMinutes: 24,
}

const CARDIO_ROWING_INTERVALS: CardioBlock = {
  modality: 'rower',
  kind: 'intervals',
  prescription: '5 × 500 m hard / 90 s rest, log avg split per rep',
  targetRpe: 8,
  targetDurationMinutes: 25,
}

const CARDIO_SLED_PUSH: CardioBlock = {
  modality: 'sled',
  kind: 'intervals',
  prescription: '4 × 20 m heavy sled push / 60 s rest',
  targetRpe: 9,
  targetDurationMinutes: 10,
}

const CARDIO_KB_COMPLEX: CardioBlock = {
  modality: 'assault_bike',
  kind: 'complex',
  prescription: 'EMOM 12: odd min — 10 KB swings / 5 push-ups; even min — 15 cal assault bike',
  targetRpe: 8,
  targetDurationMinutes: 12,
}

// (Assault-bike intervals are prescribed on the `assault-bike-intervals`
// session-exercise slot via phase-3 blueprint; no separate CardioBlock needed.)

// ---------------------------------------------------------------------------
// Phase 1 — Foundation
// ---------------------------------------------------------------------------

const P1_UPPER_A: SessionBlueprint = {
  name: 'Upper A',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-bench-press',
      role: 'main-compound-upper',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 120,
      tempo: '2-1-1-0',
      notes: null,
    },
    {
      slug: 'barbell-row',
      role: 'main-compound-upper',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'overhead-press',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: null,
    },
    {
      slug: 'lat-pulldown',
      role: 'secondary',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'lateral-raises',
      role: 'accessory',
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
    {
      slug: 'face-pull',
      role: 'accessory',
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 60,
      tempo: null,
      notes: 'Shoulder health — do not skip.',
    },
  ],
}

const P1_LOWER_A: SessionBlueprint = {
  name: 'Lower A',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_LOWER,
  cardio: null,
  exercises: [
    {
      slug: 'goblet-squat',
      role: 'main-compound-lower',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 120,
      tempo: '3-1-1-0',
      notes: 'Re-pattern movement before loading a barbell.',
    },
    {
      slug: 'romanian-deadlift',
      role: 'main-compound-lower',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 120,
      tempo: '3-0-1-0',
      notes: null,
    },
    {
      slug: 'bulgarian-split-squat',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: null,
    },
    {
      slug: 'hip-thrust',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'plank',
      role: 'core',
      sets: 3,
      repsMin: 30,
      repsMax: 45,
      restSeconds: 45,
      tempo: null,
      notes: 'reps = seconds',
    },
    {
      slug: 'pallof-press',
      role: 'core',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'per side',
    },
  ],
}

const P1_UPPER_B: SessionBlueprint = {
  name: 'Upper B',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'overhead-press',
      role: 'main-compound-upper',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 150,
      tempo: null,
      notes: 'Strict — no leg drive.',
    },
    {
      slug: 'single-arm-dumbbell-row',
      role: 'main-compound-upper',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: 'per side',
    },
    {
      slug: 'incline-dumbbell-press',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: null,
    },
    {
      slug: 'chest-supported-row',
      role: 'secondary',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'dumbbell-bicep-curl',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
    {
      slug: 'cable-triceps-pushdown',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
  ],
}

const P1_FULL_BODY: SessionBlueprint = {
  name: 'Full Body',
  type: 'hybrid',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_POSTURE,
  cardio: null,
  exercises: [
    {
      slug: 'trap-bar-deadlift',
      role: 'main-compound-lower',
      sets: 3,
      repsMin: 5,
      repsMax: 6,
      restSeconds: 150,
      tempo: null,
      notes: 'Neutral grip — spares the lower back while capturing the hinge pattern.',
    },
    {
      slug: 'push-ups',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 15,
      restSeconds: 75,
      tempo: '3-0-1-0',
      notes: null,
    },
    {
      slug: 'pull-ups',
      role: 'secondary',
      sets: 3,
      repsMin: 3,
      repsMax: 8,
      restSeconds: 90,
      tempo: null,
      notes: 'Assisted or banded if needed.',
    },
    {
      slug: 'kettlebell-swing',
      role: 'accessory',
      sets: 4,
      repsMin: 15,
      repsMax: 20,
      restSeconds: 60,
      tempo: null,
      notes: 'Metabolic finisher.',
    },
    {
      slug: 'hanging-knee-raise',
      role: 'core',
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
  ],
}

const P1_CONDITIONING: SessionBlueprint = {
  name: 'Conditioning 1',
  type: 'conditioning',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_POSTURE,
  cardio: CARDIO_STEADY_STATE,
  exercises: [
    // Week 3+ cardio switches to intervals at the generator level.
    {
      slug: 'dead-bug',
      role: 'core',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 45,
      tempo: null,
      notes: 'per side — tempo slow',
    },
    {
      slug: 'farmers-carry',
      role: 'accessory',
      sets: 3,
      repsMin: 30,
      repsMax: 45,
      restSeconds: 60,
      tempo: null,
      notes: 'reps = meters; heavy but not max',
    },
  ],
}

const REST_DAY: SessionBlueprint = {
  name: 'Rest',
  type: 'rest',
  warmup: null,
  mobility: {
    durationMinutes: 10,
    exerciseSlugs: ['couch-stretch', 'pigeon-pose', 'thoracic-rotation-quadruped', 'wall-slides'],
  },
  cardio: null,
  exercises: [],
}

// ---------------------------------------------------------------------------
// Phase 2 — Build (PPL rotation)
// ---------------------------------------------------------------------------

const P2_PUSH: SessionBlueprint = {
  name: 'Push',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-bench-press',
      role: 'main-compound-upper',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 180,
      tempo: '2-1-1-0',
      notes: 'Top set at RPE 8.',
    },
    {
      slug: 'overhead-press',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'incline-dumbbell-press',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: null,
    },
    {
      slug: 'dips',
      role: 'accessory',
      sets: 3,
      repsMin: 6,
      repsMax: 10,
      restSeconds: 75,
      tempo: null,
      notes: 'Weighted if bodyweight too easy.',
    },
    {
      slug: 'lateral-raises',
      role: 'accessory',
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
    {
      slug: 'cable-triceps-pushdown',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'Superset with lateral raises.',
    },
  ],
}

const P2_PULL: SessionBlueprint = {
  name: 'Pull',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-row',
      role: 'main-compound-upper',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 180,
      tempo: null,
      notes: 'Top set at RPE 8.',
    },
    {
      slug: 'pull-ups',
      role: 'secondary',
      sets: 4,
      repsMin: 5,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: 'Weighted as able.',
    },
    {
      slug: 'seated-cable-row',
      role: 'secondary',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'face-pull',
      role: 'accessory',
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
    {
      slug: 'barbell-curl',
      role: 'accessory',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
    {
      slug: 'dumbbell-bicep-curl',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'Superset with curl.',
    },
  ],
}

const P2_LEGS: SessionBlueprint = {
  name: 'Legs',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_LOWER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-back-squat',
      role: 'main-compound-lower',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 180,
      tempo: '3-1-1-0',
      notes: 'Top set at RPE 8.',
    },
    {
      slug: 'romanian-deadlift',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'bulgarian-split-squat',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: 'per side',
    },
    {
      slug: 'hip-thrust',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'hanging-leg-raise',
      role: 'core',
      sets: 3,
      repsMin: 6,
      repsMax: 10,
      restSeconds: 60,
      tempo: null,
      notes: 'Regress to hanging-knee-raise if needed.',
    },
    {
      slug: 'cable-crunch',
      role: 'core',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
  ],
}

const P2_UPPER_HYBRID: SessionBlueprint = {
  name: 'Upper Hybrid',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'close-grip-bench-press',
      role: 'main-compound-upper',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'single-arm-dumbbell-row',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 90,
      tempo: null,
      notes: 'per side',
    },
    {
      slug: 'seated-dumbbell-shoulder-press',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'chest-supported-row',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
    {
      slug: 'skull-crushers',
      role: 'accessory',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
    {
      slug: 'pallof-press',
      role: 'core',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'per side',
    },
  ],
}

const P2_CONDITIONING_CORE: SessionBlueprint = {
  name: 'Conditioning + Core',
  type: 'conditioning',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_POSTURE,
  cardio: CARDIO_ROWING_INTERVALS,
  exercises: [
    {
      slug: 'plank',
      role: 'core',
      sets: 3,
      repsMin: 45,
      repsMax: 60,
      restSeconds: 45,
      tempo: null,
      notes: 'reps = seconds',
    },
    {
      slug: 'side-plank',
      role: 'core',
      sets: 3,
      repsMin: 20,
      repsMax: 30,
      restSeconds: 30,
      tempo: null,
      notes: 'reps = seconds, per side',
    },
    {
      slug: 'dead-bug',
      role: 'core',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 45,
      tempo: null,
      notes: 'per side',
    },
  ],
}

// ---------------------------------------------------------------------------
// Phase 3 — Reveal (density + ab work)
// ---------------------------------------------------------------------------

const P3_UPPER_A: SessionBlueprint = {
  name: 'Upper A',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-bench-press',
      role: 'main-compound-upper',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 150,
      tempo: null,
      notes: 'RPE 7-8; conservative progression.',
    },
    {
      slug: 'barbell-row',
      role: 'main-compound-upper',
      sets: 4,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'overhead-press',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 90,
      tempo: null,
      notes: null,
    },
    {
      slug: 'lat-pulldown',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'Short rest.',
    },
    {
      slug: 'lateral-raises',
      role: 'accessory',
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 45,
      tempo: null,
      notes: 'Superset with pulldown.',
    },
    {
      slug: 'hanging-leg-raise',
      role: 'core',
      sets: 4,
      repsMin: 6,
      repsMax: 10,
      restSeconds: 60,
      tempo: null,
      notes: 'Dedicated ab work — 4 sessions/week.',
    },
    {
      slug: 'ab-wheel-rollout',
      role: 'core',
      sets: 3,
      repsMin: 6,
      repsMax: 10,
      restSeconds: 60,
      tempo: null,
      notes: null,
    },
  ],
}

const P3_LOWER_A: SessionBlueprint = {
  name: 'Lower A',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_LOWER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-back-squat',
      role: 'main-compound-lower',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 150,
      tempo: '3-1-1-0',
      notes: 'RPE 7-8.',
    },
    {
      slug: 'romanian-deadlift',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'bulgarian-split-squat',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'per side — shortened rest.',
    },
    {
      slug: 'hip-thrust',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
    {
      slug: 'cable-crunch',
      role: 'core',
      sets: 4,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
  ],
}

const P3_UPPER_B: SessionBlueprint = {
  name: 'Upper B',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'overhead-press',
      role: 'main-compound-upper',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 150,
      tempo: null,
      notes: null,
    },
    {
      slug: 'pull-ups',
      role: 'secondary',
      sets: 4,
      repsMin: 5,
      repsMax: 8,
      restSeconds: 90,
      tempo: null,
      notes: null,
    },
    {
      slug: 'incline-dumbbell-press',
      role: 'secondary',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 75,
      tempo: null,
      notes: null,
    },
    {
      slug: 'chest-supported-row',
      role: 'accessory',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
    {
      slug: 'barbell-curl',
      role: 'accessory',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
    {
      slug: 'hanging-knee-raise',
      role: 'core',
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
  ],
}

const P3_LOWER_B_FINISHER: SessionBlueprint = {
  name: 'Lower B + Finisher',
  type: 'hybrid',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_LOWER,
  cardio: CARDIO_KB_COMPLEX,
  exercises: [
    {
      slug: 'trap-bar-deadlift',
      role: 'main-compound-lower',
      sets: 4,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 150,
      tempo: null,
      notes: 'Alternate hinge vs Romanian week by week.',
    },
    {
      slug: 'front-squat',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'kettlebell-swing',
      role: 'accessory',
      sets: 4,
      repsMin: 15,
      repsMax: 20,
      restSeconds: 45,
      tempo: null,
      notes: 'Leads into the finisher complex.',
    },
    {
      slug: 'hanging-leg-raise',
      role: 'core',
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
  ],
}

const P3_CONDITIONING: SessionBlueprint = {
  name: 'Conditioning 1',
  type: 'conditioning',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_POSTURE,
  cardio: CARDIO_SLED_PUSH,
  exercises: [
    {
      slug: 'assault-bike-intervals',
      role: 'accessory',
      sets: 1,
      repsMin: 1,
      repsMax: 1,
      restSeconds: 60,
      tempo: null,
      notes: 'Follow the cardio prescription above.',
    },
    {
      slug: 'pallof-press',
      role: 'core',
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 45,
      tempo: null,
      notes: 'per side',
    },
    {
      slug: 'side-plank',
      role: 'core',
      sets: 3,
      repsMin: 30,
      repsMax: 45,
      restSeconds: 30,
      tempo: null,
      notes: 'reps = seconds, per side',
    },
  ],
}

// ---------------------------------------------------------------------------
// Phase 4 — Peak (week 13 — 6 days, then day 90 reassessment)
// ---------------------------------------------------------------------------

const P4_85PCT_UPPER: SessionBlueprint = {
  name: 'Upper — 85% volume',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_UPPER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-bench-press',
      role: 'main-compound-upper',
      sets: 3,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 150,
      tempo: null,
      notes: '85% of Phase 3 top-set weight. Stop 2 reps short.',
    },
    {
      slug: 'barbell-row',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
    {
      slug: 'lateral-raises',
      role: 'accessory',
      sets: 2,
      repsMin: 12,
      repsMax: 15,
      restSeconds: 45,
      tempo: null,
      notes: null,
    },
  ],
}

const P4_85PCT_LOWER: SessionBlueprint = {
  name: 'Lower — 85% volume',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_LOWER,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-back-squat',
      role: 'main-compound-lower',
      sets: 3,
      repsMin: 5,
      repsMax: 5,
      restSeconds: 150,
      tempo: null,
      notes: '85% of Phase 3 top-set weight.',
    },
    {
      slug: 'romanian-deadlift',
      role: 'secondary',
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      restSeconds: 120,
      tempo: null,
      notes: null,
    },
  ],
}

const P4_ACTIVATION: SessionBlueprint = {
  name: 'Activation — light, no fatigue',
  type: 'strength',
  warmup: STANDARD_WARMUP,
  mobility: MOBILITY_POSTURE,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-bench-press',
      role: 'main-compound-upper',
      sets: 2,
      repsMin: 3,
      repsMax: 3,
      restSeconds: 120,
      tempo: null,
      notes: 'Light — ~60% of top set. Bar speed, not fatigue.',
    },
    {
      slug: 'barbell-back-squat',
      role: 'main-compound-lower',
      sets: 2,
      repsMin: 3,
      repsMax: 3,
      restSeconds: 120,
      tempo: null,
      notes: 'Light — ~60%.',
    },
  ],
}

const P4_REASSESSMENT: SessionBlueprint = {
  name: 'Day 90 — Reassessment',
  type: 'hybrid',
  warmup: STANDARD_WARMUP,
  mobility: null,
  cardio: null,
  exercises: [
    {
      slug: 'barbell-bench-press',
      role: 'main-compound-upper',
      sets: 5,
      repsMin: 1,
      repsMax: 3,
      restSeconds: 180,
      tempo: null,
      notes: 'Work up to a top single. Film it.',
    },
    {
      slug: 'barbell-back-squat',
      role: 'main-compound-lower',
      sets: 5,
      repsMin: 1,
      repsMax: 3,
      restSeconds: 180,
      tempo: null,
      notes: 'Work up to a top single.',
    },
  ],
}

// ---------------------------------------------------------------------------
// Weekly slot maps (slot index 0-6 → session blueprint)
// dayOfPhaseWeek = (dayNumber - phaseStartDay) % 7
// ---------------------------------------------------------------------------

const PHASE_1_WEEK: SessionBlueprint[] = [
  P1_UPPER_A,
  P1_LOWER_A,
  P1_CONDITIONING,
  P1_UPPER_B,
  P1_FULL_BODY,
  REST_DAY,
  REST_DAY,
]

const PHASE_2_WEEK: SessionBlueprint[] = [
  P2_PUSH,
  P2_PULL,
  P2_LEGS,
  P2_UPPER_HYBRID,
  P2_CONDITIONING_CORE,
  REST_DAY,
  REST_DAY,
]

const PHASE_3_WEEK: SessionBlueprint[] = [
  P3_UPPER_A,
  P3_LOWER_A,
  P3_CONDITIONING,
  P3_UPPER_B,
  P3_LOWER_B_FINISHER,
  REST_DAY,
  REST_DAY,
]

/** Phase 4 is a special single week (6 days + reassessment). */
const PHASE_4_WEEK: SessionBlueprint[] = [
  P4_85PCT_UPPER,
  P4_85PCT_LOWER,
  P4_85PCT_UPPER,
  REST_DAY,
  P4_ACTIVATION,
  P4_REASSESSMENT,
  REST_DAY,
]

export function slotMapForPhase(phase: PhaseName): SessionBlueprint[] {
  switch (phase) {
    case 'foundation':
      return PHASE_1_WEEK
    case 'build':
      return PHASE_2_WEEK
    case 'reveal':
      return PHASE_3_WEEK
    case 'peak':
      return PHASE_4_WEEK
  }
}

// ---------------------------------------------------------------------------
// Deload rule
// ---------------------------------------------------------------------------

export type DeloadAdjustment = {
  /** Apply to every main-compound & secondary lift: load × this factor. */
  loadMultiplier: number
  /** Cap sets to this count (drop the last set). */
  setCap: number
  /** Reps stay in the same range, but stop this many reps short of failure. */
  repsInReserve: number
}

export const DELOAD: DeloadAdjustment = {
  loadMultiplier: 0.6,
  setCap: 2,
  repsInReserve: 3,
}

// ---------------------------------------------------------------------------
// Conditioning escalation (phase 1 switches steady → intervals in week 3)
// ---------------------------------------------------------------------------

export function phase1ConditioningForWeek(phaseWeek: number): CardioBlock {
  // phaseWeek is 1..4 inside phase 1
  return phaseWeek >= 3 ? CARDIO_INTERVALS_TREADMILL : CARDIO_STEADY_STATE
}

// ---------------------------------------------------------------------------
// Starting loads (week-2 starting point; week 1 is RPE-driven with null load)
// ---------------------------------------------------------------------------

/** Returns a sensible starting load for a compound/secondary at phase 1 week 2.
 *  For a returning-lifter 101kg male. Scales with body weight for other users. */
export function startingLoadKgForExerciseSlug(slug: string, weightKg: number): number | null {
  // Ratios calibrated for a 101kg returning lifter, then scaled linearly.
  // Conservative by design — the adaptation engine raises over time.
  const scale = weightKg / 101
  const table: Record<string, number> = {
    'barbell-back-squat': 60,
    'front-squat': 50,
    'pause-squat': 50,
    'goblet-squat': 22, // dumbbell or kettlebell load
    'bulgarian-split-squat': 16, // dumbbells, per hand
    'conventional-deadlift': 80,
    'romanian-deadlift': 70,
    'trap-bar-deadlift': 80,
    'hip-thrust': 60,
    'kettlebell-swing': 24,
    'barbell-bench-press': 55,
    'close-grip-bench-press': 45,
    'incline-dumbbell-press': 20, // per hand
    'overhead-press': 35,
    'seated-dumbbell-shoulder-press': 16, // per hand
    'barbell-row': 50,
    'single-arm-dumbbell-row': 24, // per hand
    'seated-cable-row': 50,
    'chest-supported-row': 18, // per hand
    'lat-pulldown': 55,
    'dumbbell-bicep-curl': 12, // per hand
    'barbell-curl': 25,
    'cable-triceps-pushdown': 25,
    'skull-crushers': 25,
    'lateral-raises': 6, // per hand, strict
    'face-pull': 20,
    'cable-crunch': 40,
    'farmers-carry': 24, // per hand
    'sled-push': 60, // add plates on sled
  }
  const base = table[slug]
  if (base == null) return null
  // Round to nearest 2.5kg for barbell lifts, nearest 1kg for dumbbell/cable
  const scaled = base * scale
  const snap = isBarbellLift(slug) ? 2.5 : 1
  return Math.max(snap, Math.round(scaled / snap) * snap)
}

const BARBELL_LIFTS = new Set([
  'barbell-back-squat',
  'front-squat',
  'pause-squat',
  'conventional-deadlift',
  'romanian-deadlift',
  'trap-bar-deadlift',
  'hip-thrust',
  'barbell-bench-press',
  'close-grip-bench-press',
  'overhead-press',
  'barbell-row',
  'barbell-curl',
])

function isBarbellLift(slug: string): boolean {
  return BARBELL_LIFTS.has(slug)
}

// ---------------------------------------------------------------------------
// Weekly load progression (delta per week inside a phase)
// ---------------------------------------------------------------------------

/** Safe per-week load increase (in kg) by exercise role. Per spec caps. */
export function weeklyLoadDeltaKg(role: ExerciseRole, slug: string): number {
  switch (role) {
    case 'main-compound-lower':
    case 'main-compound-upper':
      return isBarbellLift(slug) && isLowerCompound(slug) ? 2.5 : 1.25
    case 'secondary':
      return isBarbellLift(slug) && isLowerCompound(slug) ? 1.25 : 1
    case 'accessory':
      return 1
    default:
      return 0
  }
}

const LOWER_COMPOUNDS = new Set([
  'barbell-back-squat',
  'front-squat',
  'pause-squat',
  'conventional-deadlift',
  'romanian-deadlift',
  'trap-bar-deadlift',
  'hip-thrust',
])

function isLowerCompound(slug: string): boolean {
  return LOWER_COMPOUNDS.has(slug)
}
