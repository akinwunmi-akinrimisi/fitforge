# exercise-library-spec.md — FitForge90

> The schema and seed plan for the exercise library. Every exercise ships with full safety + educational detail rendered in the app UI.

---

## Schema — `src/domain/exercise.ts`

```ts
import { z } from "zod";

export const exerciseCategoryEnum = z.enum([
  "push",
  "pull",
  "squat",
  "hinge",
  "carry",
  "core",
  "conditioning",
  "mobility",
  "warmup",
]);

export const equipmentEnum = z.enum([
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "bodyweight",
  "band",
  "treadmill",
  "bike",
  "rower",
  "sled",
  "assault_bike",
]);

export const difficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);

export const exerciseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: exerciseCategoryEnum,
  primary_muscles: z.array(z.string()).min(1),
  secondary_muscles: z.array(z.string()),
  equipment: z.array(equipmentEnum).min(1),
  difficulty: difficultyEnum,
  gif_url: z.string().url(),

  // Educational + safety content rendered in the Exercise Detail drawer
  posture_cues: z.array(z.string()).min(3).max(6),
  benefits: z.object({
    physiological: z.array(z.string()).min(1),
    aesthetic: z.array(z.string()),
    functional: z.array(z.string()),
  }),
  movement_steps: z.array(z.object({
    phase: z.enum(["setup", "eccentric", "bottom", "concentric", "lockout"]),
    instruction: z.string(),
  })).min(3),
  safety_warnings: z.array(z.string()).min(1),
  contraindications: z.array(z.string()),
  body_changes_to_watch: z.object({
    green_flags: z.array(z.string()).min(1),   // what progress feels/looks like
    red_flags: z.array(z.string()).min(1),     // stop-and-reassess signals
  }),
  common_mistakes: z.array(z.object({
    mistake: z.string(),
    correction: z.string(),
  })).min(3).max(5),
  progression: z.string().nullable(),          // slug of the next harder variant
  regression: z.string().nullable(),           // slug of the easier variant

  // Programming metadata
  default_sets: z.tuple([z.number(), z.number()]),   // [min, max]
  default_reps: z.tuple([z.number(), z.number()]),
  default_rest_seconds: z.number(),
  tempo: z.string().nullable(),                // e.g. "3-1-1-0" or null
}).strict();

export type Exercise = z.infer<typeof exerciseSchema>;
```

---

## Full example — Barbell Back Squat

```ts
{
  slug: "barbell-back-squat",
  name: "Barbell Back Squat",
  category: "squat",
  primary_muscles: ["quadriceps", "glutes"],
  secondary_muscles: ["hamstrings", "spinal erectors", "core", "adductors"],
  equipment: ["barbell"],
  difficulty: "intermediate",
  gif_url: "https://media.giphy.com/media/<curated>/giphy.gif",

  posture_cues: [
    "Bar rests on upper traps (high bar) or rear delts (low bar) — never on the neck",
    "Feet shoulder-width, toes turned out 15-30 degrees",
    "Brace core hard — imagine bracing before a punch — before unracking",
    "Break at hips and knees simultaneously; sit down and back, not just down",
    "Knees track over the line of the toes, never collapse inward",
    "Drive through the mid-foot; chest stays up throughout",
  ],

  benefits: {
    physiological: [
      "Recruits the largest muscle groups in the body — highest systemic hormonal response of any lift",
      "Builds lower-body strength and muscle mass faster than any single-joint alternative",
      "Improves bone density through axial loading",
    ],
    aesthetic: [
      "Develops quad sweep, glute shape, and visible separation between quad heads",
      "Thickens the core and spinal erectors — contributing to a denser, more athletic look",
    ],
    functional: [
      "Carries over to every lower-body athletic action: jumping, sprinting, changing direction",
      "Reinforces the hip-hinge/knee-bend pattern that protects the lower back in daily life",
    ],
  },

  movement_steps: [
    { phase: "setup", instruction: "Position bar on upper back, grip just outside shoulders, elbows down and tucked. Unrack with both feet under the bar, then step back in 2-3 small steps." },
    { phase: "setup", instruction: "Set feet shoulder-width, toes slightly out. Take a big diaphragmatic breath and brace." },
    { phase: "eccentric", instruction: "Break at hips AND knees together. Descend under control — roughly 2-3 seconds down. Maintain upright chest." },
    { phase: "bottom", instruction: "Hit depth where the hip crease drops below the top of the knee. Do not bounce." },
    { phase: "concentric", instruction: "Drive the floor away with the mid-foot. Hips and shoulders rise together — hips should not shoot up first." },
    { phase: "lockout", instruction: "Stand tall, glutes squeezed, exhale at the top. Reset brace before the next rep." },
  ],

  safety_warnings: [
    "ALWAYS use safety pins or spotter arms set just below your bottom depth",
    "Never squat without a warm-up including 2-3 progressively heavier sets",
    "Stop the set if form breaks down — a failed rep with good form is better than a grinded-out rep with lumbar flexion",
    "If the bar feels like it's slipping or rolling up your back, re-rack and reset — do not adjust mid-set",
    "Weight progression rule: add at most 2.5kg per week on this lift unless two consecutive weeks of ≥90% set completion at the current load",
  ],

  contraindications: [
    "Acute lower-back pain or disc issue — substitute goblet squat or leg press until cleared",
    "Knee pain that worsens with deep flexion — regress to box squat to a higher box",
    "Shoulder mobility limitation preventing bar placement — use safety squat bar or front squat",
  ],

  body_changes_to_watch: {
    green_flags: [
      "Quads and glutes feel worked the day after — mild muscle soreness (DOMS), not joint pain",
      "Core feels fatigued — sign your brace was doing its job",
      "Over weeks: visible quad sweep becoming more pronounced; glute shape filling out",
      "Ability to descend under more control without effort — technique is consolidating",
    ],
    red_flags: [
      "Sharp lower-back pain during or after the set — STOP. Regress and re-examine bracing + depth.",
      "Knee pain that sharpens rather than dulls during warm-up sets",
      "Any shift or twinge that doesn't feel like muscle — stop and reassess",
      "Persistent asymmetry (one side feels much harder than the other) — note it and film the next session",
    ],
  },

  common_mistakes: [
    { mistake: "Knees caving inward (valgus) on the way up", correction: "Cue 'spread the floor' — actively push knees out as you drive up. Reduce weight until you can hold knees out for all reps." },
    { mistake: "Hips shooting up faster than shoulders (turning a squat into a good-morning)", correction: "Pause at the bottom for 1 second; drive hips and chest up together. Often fixed by reducing load and rebuilding bracing." },
    { mistake: "Heels rising at the bottom", correction: "Work on ankle mobility (calf stretch, banded dorsiflexion); consider weightlifting shoes with a raised heel." },
    { mistake: "Losing upper-back tightness — bar rolling up the neck", correction: "Pull the bar DOWN into the traps and squeeze shoulder blades together before unracking." },
    { mistake: "Not hitting depth", correction: "Film from the side. If hips aren't dropping below knees, address ankle/hip mobility or reduce load." },
  ],

  progression: "pause-squat",
  regression: "goblet-squat",

  default_sets: [3, 4],
  default_reps: [5, 8],
  default_rest_seconds: 180,
  tempo: "3-1-1-0",
}
```

---

## Library scope — 60-80 exercises

### Warm-up primitives (5-7 exercises, tagged `category: warmup`)
world's greatest stretch, cat-cow, scapular push-ups, hip 90-90, band pull-apart, glute bridge, leg swings

### Push (10-12)
barbell bench press, incline dumbbell press, overhead press (barbell), seated dumbbell shoulder press, push-ups, dips, cable chest fly, lateral raises, dumbbell Arnold press, close-grip bench press, skull crushers, cable triceps pushdown

### Pull (10-12)
pull-ups, chin-ups, lat pulldown, barbell row, dumbbell row (single arm), seated cable row, face pull, dumbbell bicep curl, barbell curl, cable curl, reverse fly, chest-supported row

### Squat (5-6)
barbell back squat, front squat, goblet squat, leg press, Bulgarian split squat, pause squat (progression)

### Hinge (5-6)
conventional deadlift, Romanian deadlift (RDL), trap bar deadlift, kettlebell swing, good morning, hip thrust

### Carry (2-3)
farmer's carry, suitcase carry, sled push

### Core (6-8)
plank, side plank, dead bug, hollow hold, hanging knee raise, hanging leg raise, cable crunch, Pallof press, ab wheel rollout

### Conditioning (4-6)
treadmill steady-state, treadmill intervals, rowing intervals, assault bike intervals, sled drag, kettlebell complex

### Mobility (6-8)
couch stretch, pigeon pose, thoracic rotation (quadruped), wall slides, neck retraction, wrist flexor stretch, dead hang, 90/90 hip switch

---

## GIF curation rules

- **Source:** Giphy, from known fitness channels only. No meme feeds.
- Each GIF must show:
  - One full rep with proper form
  - A full side-view or 3/4 angle (not head-on)
  - No music/text overlays
  - Loop cleanly (no jump cuts)
- **Backup plan if a Giphy URL breaks:** every seed entry has a fallback `gif_url_alt` field in the seed file (not in the DB schema) — the seed script picks the working one.
- **Do not deep-link hotlink-protected sources.** Verify each URL renders in an `<img>` before committing.
- Download-and-self-host is the medium-term plan (store in `exercise-gifs` public bucket) — for M2 ship, Giphy URLs are fine as long as they resolve.

---

## Rendering in the UI — session screen

**Default visible on each exercise card:**
- Name, target sets × reps × load
- GIF (autoplay, muted, loop)
- Top 2 posture cues inline

**Expand Exercise Detail drawer shows:**
- All posture cues
- Full `movement_steps` walk-through
- `benefits` organized by tab (physiological / aesthetic / functional)
- `safety_warnings` — prominent, with warning icon
- `contraindications`
- `body_changes_to_watch.green_flags` and `.red_flags` — visually distinct
- `common_mistakes` — mistake vs. correction pairs
- Links to `progression` / `regression` exercises
