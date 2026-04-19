# nutrition-spec.md — FitForge90

> Macro math, food database structure, meal logging behavior, and weekly recalibration.
> 80% coverage Vitest tests required on the macro calculator.

---

## 1. Macro calculation

### Inputs
- `sex` — "male" / "female"
- `age` — years
- `height_cm`
- `weight_kg`
- `activity_level` — "sedentary" / "light" / "moderate" / "active" / "very_active"
- `goal` — "aggressive_cut" / "moderate_cut" / "recomp" / "lean_gain"
- `week_in_plan` — integer 1-13 (adjusts deficit depth by phase)

### Step 1 — BMR (Mifflin-St Jeor)

```
men:   BMR = 10 × weight + 6.25 × height - 5 × age + 5
women: BMR = 10 × weight + 6.25 × height - 5 × age - 161
```

For the owner: `BMR = 10(101) + 6.25(183) - 5(34) + 5 = 1010 + 1144 - 170 + 5 = 1989 kcal`

### Step 2 — TDEE

Apply activity multiplier:

| Level | Multiplier |
|---|---|
| sedentary (desk, no training) | 1.2 |
| light (1-3 sessions/week) | 1.375 |
| **moderate (3-5 sessions/week) ← owner** | 1.55 |
| active (6-7 sessions/week) | 1.725 |
| very_active (2×/day or physical job) | 1.9 |

Owner TDEE: `1989 × 1.55 ≈ 3083 kcal`

### Step 3 — deficit by phase

| Phase | Week | Deficit | Target kcal for owner |
|---|---|---|---|
| Foundation | 1-4 | -500 (16%) | ~2583 kcal |
| Build | 5-8 | -650 (21%) | ~2433 kcal |
| Reveal | 9-12 | -750 (24%) | ~2333 kcal |
| Peak | 13 | maintain | ~3083 kcal (strategic break before photos) |

**Hard floor: 1900 kcal.** Calculator never returns a value below this. If deficit math demands it, return 1900 and flag in the UI.

### Step 4 — macro split

Fixed priority: **protein first, fat floor, carbs fill**.

- **Protein**: 2.0 g/kg body weight (owner: ~202g → 808 kcal)
- **Fat**: 0.8 g/kg floor, but no less than 25% of total kcal (owner: ~81g → 729 kcal)
- **Carbs**: remaining kcal ÷ 4

Owner phase-1 example:
- kcal target: 2583
- protein: 202g × 4 = 808 kcal
- fat: 81g × 9 = 729 kcal  (meets 25% floor: 729/2583 = 28% ✓)
- carbs: (2583 - 808 - 729) / 4 = 261g

### Step 5 — refeed day (phase 2 + 3 only)

One day per week at maintenance kcal (TDEE). Protein stays the same, extra kcal go to carbs.

### Step 6 — weekly recalibration

Based on **trend weight**, not daily weight:
- Compute 7-day moving average weight
- Compare to moving average 7 days prior
- Expected loss rate by phase: -0.6 kg/week (Phase 1), -0.8 kg/week (Phase 2), -0.7 kg/week (Phase 3)

Decisions:
- Loss within ±0.2 kg of expected → hold macros
- Loss significantly faster than expected → surface a warning (muscle-loss risk), don't auto-cut further
- Loss slower than expected for 2 consecutive weeks → adjust kcal down by 100 (subject to 1900 floor)
- Weight up despite logged compliance → re-verify entry accuracy; don't adjust until 2 weeks of trend

### Pseudocode — `lib/nutrition/macros.ts`

```ts
export const CAL_FLOOR = 1900;

export function calculateBmr(input: BmrInput): number {
  const { sex, weightKg, heightCm, age } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55,
    active: 1.725, very_active: 1.9,
  };
  return bmr * multipliers[activity];
}

export function calculateTargetKcal(tdee: number, phase: Phase): number {
  const deficits: Record<Phase, number> = {
    foundation: 500, build: 650, reveal: 750, peak: 0,
  };
  return Math.max(CAL_FLOOR, Math.round(tdee - deficits[phase]));
}

export function calculateMacros(kcal: number, weightKg: number): Macros {
  const proteinG = Math.round(weightKg * 2.0);
  const proteinKcal = proteinG * 4;

  const fatFloorG = Math.round(weightKg * 0.8);
  const fatFloorKcal = fatFloorG * 9;
  const fat25PctKcal = kcal * 0.25;
  const fatKcal = Math.max(fatFloorKcal, fat25PctKcal);
  const fatG = Math.round(fatKcal / 9);

  const carbsKcal = Math.max(0, kcal - proteinKcal - fatG * 9);
  const carbsG = Math.round(carbsKcal / 4);

  return { kcal, proteinG, fatG, carbsG };
}
```

---

## 2. Food database

### Schema — `public.foods`

```sql
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,                    -- 'nigerian' / 'global' / 'supplement' / 'restaurant'
  tags text[] default '{}',                  -- searchable: ['rice','carb','staple','nigerian']

  -- Per 100g (canonical)
  kcal_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  fiber_per_100g numeric default 0,

  -- Default serving for quick entry
  default_serving_g numeric not null,
  default_serving_label text not null,       -- '1 medium plate', '1 handful', '1 scoop'

  is_custom boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index on public.foods using gin (tags);
create index on public.foods using gin (to_tsvector('english', name));
```

### Seed — 200 entries

**Nigerian staples (~80 entries):**
- Rice dishes: jollof rice, fried rice, coconut rice, white rice + stew, ofada rice, tuwo
- Swallows: pounded yam, eba (garri), amala, fufu, semo, wheat swallow
- Soups: egusi, okra, efo riro, ogbono, afang, edikang ikong, pepper soup
- Proteins: grilled chicken, suya, fried fish, boiled/fried beef, goat meat, turkey, moi moi, akara, ewa agoyin
- Snacks: puff-puff, chin-chin, plantain chips (ipekere), boiled corn, roasted corn + ube, agbalumo
- Beverages: zobo, kunnu, palm wine (noted non-recommended daily)
- Street food: boli (roasted plantain) + groundnut, Indomie + egg, bread + akara + pap

**Global basics (~80 entries):**
- Proteins: chicken breast, chicken thigh, salmon, tuna, egg, egg white, Greek yogurt, cottage cheese, whey protein, ground beef (85/15), turkey breast, tofu, tempeh, sardines
- Carbs: oats (rolled), brown rice, white rice, pasta, bread (whole wheat), sweet potato, white potato, quinoa, lentils, black beans, chickpeas
- Fats: olive oil, avocado, almonds, peanut butter, mixed nuts, cheese, butter, tahini
- Fruits: banana, apple, orange, pineapple, mango, watermelon, berries (mixed), dates
- Veg: broccoli, spinach, tomato, cucumber, bell pepper, carrot, cabbage, kale, green beans, onion

**Supplements (~10 entries):**
- Whey isolate, casein, creatine monohydrate, multivitamin, vitamin D3, omega-3, magnesium, pre-workout, BCAA (noted as low-value for most users)

**Restaurant / takeout patterns (~30 entries):**
- Nigerian bukka plate estimates, pizza slice averages, jollof takeout plate, suya takeout, shawarma, meat pie, doughnut, Coke (330ml), orange juice (250ml)

### Accuracy standard
Macro values verified against:
- USDA FoodData Central (global items)
- FAO West African Food Composition Table (Nigerian staples)
- At least 2 reputable sources where official data is thin

Flag in the seed comments when a value is an estimate.

---

## 3. Meal logging

### Schema

```sql
create table public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  servings_g numeric not null check (servings_g > 0),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- Derived macros computed on read (no duplication)
create view public.nutrition_entries_with_macros as
select
  ne.*,
  f.name as food_name,
  round((f.kcal_per_100g * ne.servings_g / 100)::numeric, 1) as kcal,
  round((f.protein_per_100g * ne.servings_g / 100)::numeric, 1) as protein_g,
  round((f.carbs_per_100g * ne.servings_g / 100)::numeric, 1) as carbs_g,
  round((f.fat_per_100g * ne.servings_g / 100)::numeric, 1) as fat_g
from public.nutrition_entries ne
join public.foods f on f.id = ne.food_id;
```

### UI flow

1. User taps "+" next to a meal section
2. Full-screen sheet: search input at top, recent foods below, "my meals" tab, "custom" tab
3. Tap a food → servings input (grams, pre-filled with `default_serving_g`, with a quick "× 2" / "÷ 2" control)
4. Tap "Add" → entry appears in the meal, macro ring updates
5. Long-press an entry → edit or delete

### "My meals"
- User can save a composed meal (multiple food entries) as a named meal
- Stored in `user_saved_meals` table with a junction table for ingredients
- One tap to re-add the full meal

### Water
- Separate from food — `water_logs` table with `amount_ml`
- Default quick tap = 250ml, swipe to change
- Resets at 04:00 Africa/Lagos (chosen over midnight so late-night water counts to the correct day)

---

## 4. Weekly compliance heatmap

- 7 rows × 4 columns (kcal, protein, carbs, fat)
- Each cell colored by how close the day's intake was to the target:
  - Within ±5% → accent sage
  - Within ±15% → neutral
  - Outside ±15% → muted red
- Used by the adaptation engine as an input to compliance score

---

## 5. Tests required

- `calculateBmr` — verify against reference values for men and women across age/weight ranges
- `calculateTdee` — all 5 activity multipliers
- `calculateTargetKcal` — all 4 phases, plus the 1900 kcal floor is never violated
- `calculateMacros` — protein always 2.0g/kg, fat never below 0.8g/kg AND never below 25% of kcal, carbs are the remainder
- Edge case: very low body weight where protein+fat floors exceed kcal target → return a `MacrosInfeasible` error for the UI to handle (in practice, shouldn't happen for this user)
- Property-based test: for any valid input, `protein_kcal + fat_kcal + carbs_kcal` ≈ `target_kcal` (within rounding)

Target: **>80% line coverage, 100% branch coverage on the floor/cap logic.**
