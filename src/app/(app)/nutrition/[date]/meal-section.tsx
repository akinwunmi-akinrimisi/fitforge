'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FoodSearch } from './food-search'
import { removeNutritionEntry } from '../actions'
import type { MealType } from '@/domain/nutrition'
import type { NutritionEntryRow, SavedMealWithItems } from './types'

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export function MealSection({
  mealType,
  entries,
  savedMeals,
}: {
  mealType: MealType
  entries: NutritionEntryRow[]
  savedMeals: SavedMealWithItems[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const kcal = entries.reduce((acc, e) => acc + Number(e.kcal), 0)
  const protein = entries.reduce((acc, e) => acc + Number(e.protein_g), 0)

  function remove(id: string) {
    startTransition(async () => {
      const res = await removeNutritionEntry(id)
      if (res.ok) router.refresh()
      else toast.error(res.message)
    })
  }

  return (
    <section className="space-y-3 border border-border bg-card p-5">
      <header className="flex items-baseline justify-between gap-3">
        <p className="section-eyebrow">{MEAL_LABEL[mealType]}</p>
        <p className="numeric text-xs text-muted-foreground">
          {Math.round(kcal)} kcal · {Math.round(protein)}g P
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{e.food_name}</p>
                <p className="numeric text-xs tabular-nums text-muted-foreground">
                  {Number(e.servings_g)}g · {Math.round(Number(e.kcal))} kcal ·{' '}
                  {Math.round(Number(e.protein_g))}g P
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                disabled={pending}
                aria-label={`Remove ${e.food_name}`}
                className="text-muted-foreground hover:text-primary"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FoodSearch mealType={mealType} savedMeals={savedMeals}>
        <Button type="button" variant="outline" className="w-full" size="lg">
          <Plus className="h-4 w-4" />
          Add to {MEAL_LABEL[mealType].toLowerCase()}
        </Button>
      </FoodSearch>
    </section>
  )
}
