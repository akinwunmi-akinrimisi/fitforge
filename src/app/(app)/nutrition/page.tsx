import { redirect } from 'next/navigation'
import { todayAppDayKey } from '@/lib/dates/lagos'

export const dynamic = 'force-dynamic'

export default function NutritionIndex() {
  redirect(`/nutrition/${todayAppDayKey()}`)
}
