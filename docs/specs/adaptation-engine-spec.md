# adaptation-engine-spec.md — FitForge90

> Weekly recalibration logic. Runs Sunday 23:59 Africa/Lagos.
> >80% unit-test coverage required.

---

## Mandate

Each week, look at what the user actually did over the past 7 days, and adjust next week's plan — volume, load progression, kcal target — within safety limits. Log every decision with human-readable reasoning.

---

## Inputs

```ts
export type RecalibrationInput = {
  profileId: string;
  weekNumber: number;                  // 1-13, the week that just ended
  sessions: SessionLogSummary[];       // all session logs from this week
  nutritionEntries: NutritionDaySummary[];  // 7 days of macros
  checkins: DailyCheckin[];            // up to 7
  weighIn: { kg: number; trend7dKg: number } | null;  // this Sunday's weigh-in + trend
  painNotes: PainNote[];               // any logged pain notes this week
  lastAdaptation: Adaptation | null;   // the previous week's decision, for context
};
```

---

## Compliance score

```
training   = sessions_completed / sessions_planned                   // 0..1
nutrition  = days_within_±10%_of_kcal_target / 7                     // 0..1
composite  = 0.5 * training + 0.5 * nutrition                         // 0..1
```

A day counts as a "nutrition compliance day" if **kcal within ±10% of target AND protein ≥ 90% of target**. Carbs/fat flexibility is intentional.

---

## Decision tree

Order matters — check in this order. The first rule that fires determines the outcome; guardrails always apply afterward.

### 1. Forced deload (overrides everything)
If `weekNumber + 1 ∈ {4, 8, 12, 13}` → next week is a deload/peak week already in the plan. Do not modify.

### 2. Red-flag pain interrupt
If `painNotes.length > 0` AND any pain severity ≥ 6 → cap next week's volume at 70% of the planned volume for the affected movement pattern. Surface a recovery note in the UI. Do not progress load on that pattern.

### 3. Sleep floor
If `avg_sleep_hours_over_7_days < 6` → do not increase load on any compound. Hold current loads. Surface a note explaining the sleep link.

### 4. High compliance + on-track trend
If `composite ≥ 0.9` AND `weighIn.trend7dKg` is within ±0.2 kg of the phase target:
- Progress loads per phase rules (subject to caps below)
- Volume stays the same
- Reasoning: "Compliance {composite*100}%, trend on target. Progressing loads."

### 5. High compliance + trend too fast
If `composite ≥ 0.9` AND weight loss > (phase_target + 0.4) kg/week:
- Hold loads
- Surface warning: aggressive loss risks muscle loss
- Do NOT auto-cut kcal further
- Reasoning captures the warning

### 6. High compliance + trend too slow
If `composite ≥ 0.9` AND weight loss < (phase_target - 0.3) kg/week AND this is the 2nd consecutive such week:
- Decrease kcal by 100 (subject to 1900 floor)
- Hold loads
- Reasoning: "Compliance strong but trend below target for 2 weeks. kcal reduced 100."

### 7. Medium compliance
If `0.7 ≤ composite < 0.9`:
- Hold everything (loads, volume, kcal)
- Reasoning: "Compliance {composite*100}%. Holding current prescription."

### 8. Low compliance
If `composite < 0.7`:
- Reduce volume 15% (one fewer set on each compound, one fewer exercise on accessories)
- Hold loads
- Surface a non-judgmental reflection prompt: "What got in the way this week?" with short-answer input
- Reasoning: "Compliance {composite*100}%. Volume reduced 15% to rebuild momentum."

---

## Guardrails (applied after decision tree, never override)

Defined in `lib/adaptation/guardrails.ts`:

| Guardrail | Cap |
|---|---|
| Lower-body compound load increase | ≤ 2.5 kg/week |
| Upper-body compound load increase | ≤ 1.25 kg/week |
| Isolation load increase | ≤ 1 kg/week |
| Load increase without 2 consecutive weeks ≥ 90% set completion at current load | blocked |
| Weekly volume increase | ≤ 10% week-over-week |
| Weekly volume decrease | ≤ 30% (if decision tree says more, clamp to -30% and flag) |
| kcal auto-decrease per week | ≤ 100 |
| kcal floor | 1900 (applies to the whole plan) |
| Mandatory deload on week 4, 8, 12 | cannot skip |

If any guardrail clamps a decision-tree output, log it in the `reasoning` field.

---

## Output

```ts
export type Adaptation = {
  id: string;
  profileId: string;
  weekNumberClosed: number;        // the week just ended
  weekNumberAdjusted: number;      // the week being modified
  compositeScore: number;          // 0..1
  trainingCompliance: number;      // 0..1
  nutritionCompliance: number;     // 0..1
  trendKg: number | null;
  decision: "progress" | "hold" | "reduce" | "deload_forced" | "pain_interrupt" | "sleep_hold";
  changes: {
    kcalDelta: number;             // usually 0, -100 in reduce-slow case
    loadAdjustments: Array<{ exerciseSlug: string; deltaKg: number }>;
    volumeAdjustment: number;      // multiplier, e.g. 1.0 = no change, 0.85 = -15%
  };
  reasoning: string;               // human-readable, 1-3 sentences
  createdAt: string;
};
```

One row per week per user. Stored in `adaptations` table. Rendered in a timeline in the dashboard so the user can see the history.

---

## Human-readable reasoning — examples

| Scenario | Reasoning text |
|---|---|
| Progress | "Strong week — 100% sessions, 6/7 nutrition days on target, weight trend -0.6kg (target -0.5kg). Progressing bench +1kg, squat +2.5kg, RDL +2.5kg." |
| Hold (mid compliance) | "Mixed week — 4/5 sessions, 4/7 nutrition days on target. Holding loads and macros to consolidate. Aim for 5/7 nutrition days next week." |
| Reduce (low compliance) | "Tough week — 2/5 sessions completed, trend flat. Reducing volume 15% to make next week more sustainable. What got in the way?" |
| Pain interrupt | "Lower-back pain flagged on Tuesday (severity 7). Capping lower-body volume at 70% next week, holding loads. Recovery note surfaced." |
| Sleep hold | "Average sleep 5.1 hours over the week. Holding loads — training adaptation requires recovery. Prioritize sleep before pushing volume." |
| Forced deload | "Week 4 — scheduled deload. Volume and intensity reduced per plan. This week is intentional; the next block starts fresh." |

---

## Pseudocode

```ts
export async function weeklyRecalibrate(
  input: RecalibrationInput
): Promise<Adaptation> {
  // 1. Compute compliance
  const training = input.sessions.length > 0
    ? input.sessions.filter(s => s.completed).length / input.sessions.length
    : 0;
  const nutrition = input.nutritionEntries.filter(isCompliantDay).length / 7;
  const composite = 0.5 * training + 0.5 * nutrition;

  // 2. Decision tree
  let decision = decide({
    weekNumber: input.weekNumber,
    composite,
    trend: input.weighIn?.trend7dKg ?? null,
    pain: input.painNotes,
    avgSleep: averageSleep(input.checkins),
    phaseTargetLossPerWeek: phaseTargetLoss(input.weekNumber),
    consecutiveSlowWeeks: consecutiveSlowWeeks(input.lastAdaptation, input.weighIn),
  });

  // 3. Apply guardrails
  decision = applyGuardrails(decision, input);

  // 4. Persist (separate function — this one stays pure except for the resulting object)
  return buildAdaptation(input, composite, decision);
}
```

Keep `decide` and `applyGuardrails` as pure functions. The persistence wrapper lives in a separate file.

---

## Tests — required scenarios

Every one of these is a unit test:

1. **Forced deload on week 4** — any combination of compliance inputs results in a deload-forced decision
2. **High compliance on-track** — progresses compound loads within the cap
3. **High compliance fast loss** — holds loads, issues warning
4. **High compliance slow loss, 1 week** — hold
5. **High compliance slow loss, 2 consecutive weeks** — kcal -100
6. **Medium compliance** — hold
7. **Low compliance** — volume -15%
8. **Pain note severity 7** — pain interrupt fires regardless of compliance
9. **Average sleep 5.8h** — sleep hold fires regardless of compliance
10. **Guardrail clamp** — decision tree says "+5kg on squat," clamp to +2.5kg, reasoning logs the clamp
11. **kcal floor** — deep into phase 3, composite rule wants kcal < 1900, clamp to 1900 and flag
12. **First-week scenario** — `lastAdaptation` is null, engine still runs

Property-based tests (fast-check): for any valid input, output `decision` ∈ allowed enum; output `volumeAdjustment` ∈ [0.7, 1.1]; output `kcalDelta` ∈ [-100, +200].

---

## Scheduling

- **Primary:** Postgres `pg_cron` job `select cron.schedule('weekly-recalibrate', '59 22 * * 0', $$ select net.http_post(...) $$)` — Sunday 22:59 UTC = Sunday 23:59 Lagos (UTC+1)
- **Fallback:** if `pg_cron` isn't available on the self-hosted Supabase instance, run via an external cron (systemd timer on the VPS) calling `/api/cron/recalibrate` with `CRON_SHARED_SECRET`
- **Idempotency:** if the recalibration for `weekNumber = N` has already run, return the existing adaptation — don't double-write
