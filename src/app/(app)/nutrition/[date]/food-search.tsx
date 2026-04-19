'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { addNutritionEntry, addCustomFood, logSavedMeal } from '../actions'
import type { MealType } from '@/domain/nutrition'
import type { FoodRow, SavedMealWithItems } from './types'

export function FoodSearch({
  mealType,
  savedMeals,
  children,
}: {
  mealType: MealType
  savedMeals: SavedMealWithItems[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodRow[]>([])
  const [searching, setSearching] = useState(false)
  const [pending, startTransition] = useTransition()

  // Debounced search via Supabase ilike on name + tags.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const supabase = createSupabaseBrowserClient()
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('foods')
        .select(
          'id, slug, name, category, tags, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_serving_g, default_serving_label, is_custom',
        )
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(30)
      setResults((data ?? []) as FoodRow[])
      setSearching(false)
    }, 200)
    return () => clearTimeout(t)
  }, [query, open])

  function onSelectFood(food: FoodRow) {
    startTransition(async () => {
      const res = await addNutritionEntry({
        foodId: food.id,
        mealType,
        servingsG: food.default_serving_g,
      })
      if (res.ok) {
        toast.success(`${food.name} · ${food.default_serving_label}`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add to {mealType}</DrawerTitle>
          <DrawerDescription>
            Search curated foods, pick from your saved meals, or add a custom one.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <Tabs defaultValue="search">
            <TabsList>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="saved">My meals ({savedMeals.length})</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="search">
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="jollof, chicken, banana…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ul className="mt-3 divide-y divide-border">
                {searching && <li className="py-3 text-sm text-muted-foreground">Searching…</li>}
                {!searching && query.length >= 2 && results.length === 0 && (
                  <li className="py-3 text-sm text-muted-foreground">
                    No results. Try the custom tab.
                  </li>
                )}
                {results.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onSelectFood(f)}
                      disabled={pending}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.category} · {f.default_serving_label} ·{' '}
                          <span className="numeric">
                            {Math.round((f.kcal_per_100g * f.default_serving_g) / 100)} kcal
                          </span>
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        Add
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="saved">
              {savedMeals.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No saved meals yet. Log a meal, then come back — we&apos;ll add a save button in a
                  later polish pass.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {savedMeals.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            const res = await logSavedMeal(m.id, mealType)
                            if (res.ok) {
                              toast.success(`${m.name} (${res.data.count} items)`)
                              setOpen(false)
                              router.refresh()
                            } else {
                              toast.error(res.message)
                            }
                          })
                        }}
                        disabled={pending}
                        className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-muted/40"
                      >
                        <div>
                          <p className="text-sm">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.items.map((it) => it.food_name).join(' · ')}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Log
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="custom">
              <CustomFoodForm
                onCreated={(food) => {
                  toast.success(`${food.name} added`)
                  onSelectFood(food as unknown as FoodRow)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function CustomFoodForm({
  onCreated,
}: {
  onCreated: (food: {
    id: string
    slug: string
    name: string
    default_serving_g: number
    default_serving_label: string
  }) => void
}) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [servingG, setServingG] = useState('')
  const [servingLabel, setServingLabel] = useState('')
  const [pending, startTransition] = useTransition()

  const kcalCheck = useMemo(() => {
    const p = Number(protein) || 0
    const c = Number(carbs) || 0
    const f = Number(fat) || 0
    const computed = 4 * p + 4 * c + 9 * f
    const entered = Number(kcal) || 0
    const delta = Math.abs(computed - entered)
    return { computed, delta }
  }, [kcal, protein, carbs, fat])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name required')
      return
    }
    const values = {
      name: name.trim(),
      kcalPer100g: Number(kcal),
      proteinPer100g: Number(protein),
      carbsPer100g: Number(carbs),
      fatPer100g: Number(fat),
      fiberPer100g: 0,
      defaultServingG: Number(servingG),
      defaultServingLabel: servingLabel.trim() || '1 serving',
      tags: [],
    }
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) {
        toast.error(`${k} must be a non-negative number`)
        return
      }
    }

    startTransition(async () => {
      const res = await addCustomFood(values)
      if (res.ok) {
        onCreated({
          id: res.data.id,
          slug: res.data.slug,
          name: values.name,
          default_serving_g: values.defaultServingG,
          default_serving_label: values.defaultServingLabel,
        })
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cf-name">Name</Label>
        <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cf-serving">Serving (g)</Label>
          <Input
            id="cf-serving"
            type="number"
            inputMode="decimal"
            value={servingG}
            onChange={(e) => setServingG(e.target.value)}
            required
            className="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-serving-label">Label</Label>
          <Input
            id="cf-serving-label"
            placeholder="1 cup, 1 piece…"
            value={servingLabel}
            onChange={(e) => setServingLabel(e.target.value)}
          />
        </div>
      </div>
      <p className="section-eyebrow">Per 100 g</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cf-kcal">kcal</Label>
          <Input
            id="cf-kcal"
            type="number"
            inputMode="decimal"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            required
            className="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-protein">protein (g)</Label>
          <Input
            id="cf-protein"
            type="number"
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            required
            className="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-carbs">carbs (g)</Label>
          <Input
            id="cf-carbs"
            type="number"
            inputMode="decimal"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            required
            className="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-fat">fat (g)</Label>
          <Input
            id="cf-fat"
            type="number"
            inputMode="decimal"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            required
            className="numeric"
          />
        </div>
      </div>
      {kcal && (
        <p
          className={`text-xs ${kcalCheck.delta > 8 ? 'text-primary' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          4·p + 4·c + 9·f = <span className="numeric">{Math.round(kcalCheck.computed)}</span> kcal{' '}
          {kcalCheck.delta > 8 ? '(off by > 8 — double-check the values)' : '✓ math checks out'}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Add + log to meal'}
      </Button>
    </form>
  )
}
