/**
 * Seed runner.
 *
 * Usage:
 *   pnpm seed           — idempotent: upsert exercises + foods, write owner plan
 *   pnpm seed:reset     — same but deletes the owner's prior plan first
 *
 * Env required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FITFORGE_OWNER_EMAIL          — email of the existing auth.users row that owns the plan
 *
 * Optional:
 *   FITFORGE_START_DATE           — YYYY-MM-DD, default today in Lagos TZ
 *   FITFORGE_OWNER_*              — override owner profile fields
 *
 * This script runs `tsx src/seed/run.ts` — Node 20+ with the tsx CLI.
 */
import 'dotenv/config'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/domain/profile'
import { generatePlan } from '@/lib/plan/generator'
import { writePlanToDb } from '@/lib/plan/persist'
import { upsertExercises, upsertFoods } from './persist-reference'

const args = process.argv.slice(2)
const reset = args.includes('--reset')

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`missing env var ${name}`)
    process.exit(1)
  }
  return v
}

function optional(name: string): string | undefined {
  return process.env[name]
}

function todayLagos(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' })
  return fmt.format(new Date())
}

async function resolveOwnerProfileId(admin: SupabaseClient, email: string): Promise<string> {
  // Supabase auth admin API — look up by email
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`)
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) return existing.id

  // Bootstrap: owner doesn't exist yet. Create + email-confirm so magic links work.
  console.log(`[seed]   no auth user for ${email} — provisioning...`)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { provisioned_by: 'seed' },
  })
  if (createErr || !created?.user) {
    throw new Error(`auth.admin.createUser failed: ${createErr?.message}`)
  }
  console.log(`[seed]   provisioned auth.users row id=${created.user.id}`)
  return created.user.id
}

async function ensureProfileRow(
  admin: SupabaseClient,
  profile: UserProfile,
  email: string,
): Promise<void> {
  const { error } = await admin.from('profiles').upsert(
    {
      id: profile.id,
      email,
      sex: profile.sex,
      age: profile.age,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      experience: profile.experience,
      activity_level: profile.activityLevel,
      cardio_baseline_minutes_at_6kmh: profile.cardioBaselineMinutesAt6kmh,
      sessions_per_week: profile.sessionsPerWeek,
      session_duration_minutes: profile.sessionDurationMinutes,
      training_time: profile.trainingTime,
      timezone: profile.timezone,
      goals: profile.goals,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`profiles upsert failed: ${error.message}`)
}

async function main(): Promise<void> {
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')
  const ownerEmail = required('FITFORGE_OWNER_EMAIL')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`[seed] mode=${reset ? 'reset' : 'idempotent'}`)

  // 1. Resolve owner
  console.log(`[seed] resolving owner profile for ${ownerEmail}...`)
  const ownerId = await resolveOwnerProfileId(admin, ownerEmail)
  console.log(`[seed]   owner id: ${ownerId}`)

  // 2. Build profile
  const profile: UserProfile = {
    id: ownerId,
    sex: 'male',
    age: Number(optional('FITFORGE_OWNER_AGE') ?? 34),
    heightCm: Number(optional('FITFORGE_OWNER_HEIGHT_CM') ?? 183),
    weightKg: Number(optional('FITFORGE_OWNER_WEIGHT_KG') ?? 101),
    experience: 'returner',
    activityLevel: 'moderate',
    cardioBaselineMinutesAt6kmh: 60,
    sessionsPerWeek: 5,
    sessionDurationMinutes: 90,
    trainingTime: 'morning_fasted',
    timezone: 'Africa/Lagos',
    goals: ['fat_loss', 'muscle_gain', 'conditioning', 'facial_fat'],
    startDate: optional('FITFORGE_START_DATE') ?? todayLagos(),
  }

  // 3. Upsert profile row
  console.log(`[seed] upserting profile row...`)
  await ensureProfileRow(admin, profile, ownerEmail)

  // 4. Reference data
  console.log(`[seed] upserting exercises...`)
  const exCount = await upsertExercises(admin)
  console.log(`[seed]   ${exCount} exercises`)

  console.log(`[seed] upserting foods...`)
  const fdCount = await upsertFoods(admin)
  console.log(`[seed]   ${fdCount} foods`)

  // 5. Generate plan (pure) + persist (side-effecting)
  console.log(`[seed] generating 90-day plan (start ${profile.startDate})...`)
  const plan = generatePlan(profile)

  console.log(`[seed] writing plan to DB...`)
  const result = await writePlanToDb(admin, plan)
  console.log(`[seed]   plan_id=${result.planId}`)
  console.log(
    `[seed]   phases=${result.phaseCount} weeks=${result.weekCount} sessions=${result.sessionCount} session_exercises=${result.exerciseRowCount}`,
  )

  console.log(`[seed] done.`)
}

main().catch((err) => {
  console.error('[seed] FAILED:', err)
  process.exit(1)
})
