# plan-generator-spec.md — FitForge90

> How `lib/plan/generator.ts` turns a user profile into a full 90-day plan in the DB.

---

## Contract

```ts
export type UserProfile = {
  id: string;                         // uuid
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  experience: "beginner" | "returner" | "intermediate" | "advanced";
  cardioBaselineMinutesAt6kmh: number;   // for the owner: 60
  sessionsPerWeek: number;               // for the owner: 5
  sessionDurationMinutes: number;        // for the owner: 90
  trainingTime: "morning_fasted" | "midday" | "evening";
  timezone: string;                      // "Africa/Lagos"
  goals: Array<"fat_loss" | "muscle_gain" | "conditioning" | "facial_fat">;
  startDate: string;                     // ISO date, day 1
};

export function generatePlan(profile: UserProfile): Plan;
```

`generatePlan` is a **pure function**. No I/O. Output is a complete `Plan` object that a separate persistence function writes to DB.

---

## Output shape

```ts
export type Plan = {
  profileId: string;
  startDate: string;
  phases: [Phase, Phase, Phase, Phase];  // Foundation, Build, Reveal, Peak
};

export type Phase = {
  number: 1 | 2 | 3 | 4;
  name: "foundation" | "build" | "reveal" | "peak";
  weeks: Week[];
};

export type Week = {
  number: number;                     // 1-13
  isDeload: boolean;
  targetKcal: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  sessions: Session[];                // length 7 (rest days included)
};

export type Session = {
  dayNumber: number;                  // 1-90
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = Sunday
  type: "strength" | "conditioning" | "hybrid" | "rest";
  name: string;                       // "Upper A", "Lower B", "Conditioning 1"
  exercises: SessionExercise[];       // empty array for rest days
  cardio: CardioBlock | null;
  mobilityBlock: MobilityBlock;
  warmup: WarmupBlock;
};

export type SessionExercise = {
  order: number;
  exerciseSlug: string;               // FK-ish to exercises table
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetLoadKg: number | null;        // null for bodyweight; for first week lifts, null = RPE-driven warm-up sets
  restSeconds: number;
  tempo: string | null;
  notes: string | null;               // occasional cue specific to this programming context
};
```

---

## Phase structures

### Phase 1 — Foundation (Weeks 1-4, Days 1-28)

**Goal:** Re-pattern movement, establish tolerance, build habit.

**Weekly split (5 sessions):**
- Day 1: Upper A (strength)
- Day 2: Lower A (strength)
- Day 3: Conditioning 1 (treadmill intervals or sled)
- Day 4: Upper B (strength)
- Day 5: Full Body (strength + short metabolic finisher)
- Days 6-7: rest or light walking

**Exercise selection rules:**
- Foundational compounds only: squat (goblet or back), Romanian deadlift, bench press, overhead press, pull-up or lat pulldown, barbell or dumbbell row
- 3 sets × 8-10 reps on compounds
- 3 sets × 10-12 reps on accessories
- 2 rest minutes on compounds, 60-90s on accessories
- Load prescription for week 1: RPE-driven warm-up sets → top set at RPE 7 (3 reps in reserve)
- Weeks 2-3: add 2.5kg on lower-body compounds if top set hit ≤ RPE 8, 1kg on upper body compounds
- **Week 4: deload** — same exercises, 60% of week-3 load, 2 sets instead of 3, stop 3 reps short

**Conditioning:**
- Week 1-2: steady-state treadmill, 40 minutes at RPE 5
- Week 3+: treadmill intervals — 1 min at 8 km/h (incline 2), 2 min at 5 km/h, × 8 rounds

### Phase 2 — Build (Weeks 5-8, Days 29-56)

**Goal:** Progressive overload on the main lifts, more volume, more intensity.

**Weekly split (5 sessions, Push/Pull/Legs rotation):**
- Day 1: Push
- Day 2: Pull
- Day 3: Legs
- Day 4: Upper (Push/Pull hybrid)
- Day 5: Conditioning + core

**Exercise selection rules:**
- Main lift of the day is one of: bench, overhead press, squat, deadlift, barbell row
- Main lift: 4 × 5 at RPE 7-8, progressing by 2.5kg/week on lower body, 1-1.25kg/week on upper (if previous week ≥ 90% completion)
- Secondary: 3 × 8-10
- Accessory: 3 × 10-12, often supersets
- **Week 8: deload** — 60% load, 3 sets, stop 3 reps short

**Conditioning:**
- One refeed day weekly (user chooses — typically the day before the heaviest session)
- Heavier conditioning: sled push 4 × 20m at heavy load, OR rowing intervals 5 × 500m with 90s rest, OR kettlebell complex

**Core work:**
- 3 core exercises per session, rotating through anti-extension (plank variations), anti-rotation (Pallof), and flexion (hanging knee raise)

### Phase 3 — Reveal (Weeks 9-12, Days 57-84)

**Goal:** Tighten deficit, preserve muscle, sharpen conditioning, targeted ab work.

**Weekly split (5 sessions):**
- Day 1: Upper A (strength, higher density)
- Day 2: Lower A (strength, higher density)
- Day 3: Conditioning 1 (intervals + sled or assault bike)
- Day 4: Upper B
- Day 5: Lower B + finisher

**Exercise selection rules:**
- Shorten rest on accessories (60s → 45s) to increase density
- Add a finisher block at the end of 2 sessions/week: e.g. EMOM 10 min — 10 swings / 5 push-ups
- Add dedicated ab work 4×/week: hanging leg raise, ab wheel, cable crunch, plank progressions
- Main lift: 4 × 5 at RPE 7-8, conservative progression (1kg/week or hold)
- **Week 12: deload**

**Conditioning:**
- Fasted morning low-intensity walk (3 × 30-45 min/week) added to sedentary workdays (not on leg days)
- One harder interval session/week

**Posture-for-jawline note:** the mobility protocol tightens focus on neck retraction, deep neck flexor activation, and thoracic extension — supports perceived jawline sharpness as facial fat drops.

### Phase 4 — Peak (Week 13, Days 85-90)

**Goal:** Allow for full supercompensation before reassessment + photos.

- Days 85-87: normal sessions at 85% typical volume, at maintenance kcal
- Day 88: full rest
- Day 89: short activation session (light, no fatigue)
- Day 90: photos + measurements + strength reassessment (working up to a top single on bench and squat)

---

## Algorithm — `generatePlan`

```ts
export function generatePlan(profile: UserProfile): Plan {
  assertProfile(profile);                                  // zod-validate

  const phases = [
    buildPhase1(profile),
    buildPhase2(profile),
    buildPhase3(profile),
    buildPhase4(profile),
  ] as const;

  return {
    profileId: profile.id,
    startDate: profile.startDate,
    phases,
  };
}

function buildPhase1(profile: UserProfile): Phase {
  // For each of 4 weeks:
  //   - Compute week.targetKcal + macros via macros.ts given profile + phase
  //   - For each of 7 days:
  //     - Determine day.type by template (see table above)
  //     - If strength: build exercise list from phase-1 template
  //       - Load: week 1 = RPE-driven; week 2+ = progressed
  //       - Reps/sets per phase rules
  //     - If conditioning: build cardio block
  //     - Every day: attach warmup + mobility blocks
  //   - Week 4: mark isDeload=true and regenerate sessions with deload rules
  // return { number: 1, name: "foundation", weeks: [...] }
}

// buildPhase2, buildPhase3, buildPhase4 follow the same pattern
```

### Determinism
- Given the same `UserProfile`, the generator produces the same `Plan`. No randomness.
- Exercise selection is deterministic — e.g. for Upper A in Phase 1, it's always `bench press → barbell row → overhead press → lat pulldown → lateral raise → face pull`.

### Variant selection (where choice is allowed)
- If user profile flags a contraindication (future feature), substitute to the regression variant
- For weeks 5+, the generator can rotate secondary exercises (e.g. incline dumbbell press / dips) — but the rotation is deterministic based on week number

---

## Persistence

Separate function `writePlanToDb(plan: Plan, supabase: SupabaseClient)`:
1. Upsert `plans` row (one per user)
2. Insert phases, weeks, sessions in order
3. Insert session_exercises referencing `exercises.slug`
4. Wrap in a transaction — all or nothing

---

## Tests

- Running the generator for the owner's profile produces exactly 90 sessions
- Exactly 3 deload weeks marked: weeks 4, 8, 12
- Phase boundaries at days 29, 57, 85
- Week 1 Upper A has the expected exercise list and target reps
- Week 4 loads are 60% of week 3's final load
- `targetKcal` never below 1900 across all 13 weeks
- Load progression never exceeds 2.5kg/week on lower-body compounds
