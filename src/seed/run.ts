/**
 * Seed runner stub — real implementation lands in M2.
 *
 * M2 will:
 *   1. Load the owner UserProfile (from env or a JSON fixture)
 *   2. Call `generatePlan(profile)` from src/lib/plan/generator.ts
 *   3. Persist phases / weeks / sessions / session_exercises via the service-role client
 *   4. Seed public.exercises (60-80 rows) and public.foods (~200 rows)
 *
 * Running today prints the plan. Safe to run; writes nothing.
 */

const args = process.argv.slice(2)
const reset = args.includes('--reset')

// eslint-disable-next-line no-console
console.log('[seed] stub — M2 implements real seeding', { reset })
process.exit(0)
