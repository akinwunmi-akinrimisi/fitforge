'use client'

import { Toaster } from '@/components/ui/toaster'
import { MacroRing } from './macro-ring'
import { MealSection } from './meal-section'
import { WaterTracker } from './water-tracker'
import { ComplianceHeatmap } from './compliance-heatmap'
import type { NutritionPageData } from './types'
import type { MealType } from '@/domain/nutrition'

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export function NutritionView({ data }: { data: NutritionPageData }) {
  return (
    <div className="space-y-8 py-6">
      <header className="space-y-3">
        <p className="section-eyebrow">Nutrition · {data.date}</p>
        <h1 className="font-display text-4xl leading-[1.05]">{data.dateLabel}.</h1>
      </header>

      <section className="border border-border bg-card p-6">
        <MacroRing targets={data.targets} totals={data.totals} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {MEALS.map((m) => (
          <MealSection
            key={m}
            mealType={m}
            entries={data.entriesByMeal[m]}
            savedMeals={data.savedMeals}
          />
        ))}
      </div>

      <WaterTracker entries={data.waterEntries} targetMl={data.waterTargetMl} />

      <ComplianceHeatmap week={data.weekCompliance} />

      <Toaster />
    </div>
  )
}
