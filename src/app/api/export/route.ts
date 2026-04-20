import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CsvRow = Record<string, string | number | null | boolean>

const ALLOWED = new Set(['sets', 'nutrition', 'weight', 'checkins', 'cardio'])

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const kind = (url.searchParams.get('kind') ?? '').toLowerCase()
  if (!ALLOWED.has(kind)) {
    return NextResponse.json(
      { error: `kind must be one of ${[...ALLOWED].join(', ')}` },
      { status: 400 },
    )
  }

  const rows = await loadRows(supabase, user.id, kind)
  const csv = toCsv(rows)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="fitforge-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRows(supabase: any, profileId: string, kind: string): Promise<CsvRow[]> {
  switch (kind) {
    case 'sets': {
      const { data } = await supabase
        .from('set_logs')
        .select(
          'logged_at, session_id, session_exercise_id, set_number, weight_kg, reps, rpe, notes',
        )
        .eq('profile_id', profileId)
        .order('logged_at')
      return data ?? []
    }
    case 'nutrition': {
      const { data } = await supabase
        .from('nutrition_entries_with_macros')
        .select(
          'logged_at, meal_type, food_slug, food_name, servings_g, kcal, protein_g, carbs_g, fat_g, fiber_g',
        )
        .eq('profile_id', profileId)
        .order('logged_at')
      return data ?? []
    }
    case 'weight': {
      const { data } = await supabase
        .from('body_metrics')
        .select('measured_on, weight_kg, waist_cm, hip_cm, chest_cm, neck_cm, notes')
        .eq('profile_id', profileId)
        .order('measured_on')
      return data ?? []
    }
    case 'checkins': {
      const { data } = await supabase
        .from('daily_checkins')
        .select('check_date, sleep_hours, energy, soreness, note')
        .eq('profile_id', profileId)
        .order('check_date')
      return data ?? []
    }
    case 'cardio': {
      const { data } = await supabase
        .from('cardio_logs')
        .select('logged_at, modality, duration_seconds, distance_m, avg_hr, rpe, notes')
        .eq('profile_id', profileId)
        .order('logged_at')
      return data ?? []
    }
    default:
      return []
  }
}

function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return 'no_data\n'
  const cols = Object.keys(rows[0]!)
  const head = cols.join(',')
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const v = r[c]
          if (v === null || v === undefined) return ''
          const s = String(v)
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
          return s
        })
        .join(','),
    )
    .join('\n')
  return `${head}\n${body}\n`
}
