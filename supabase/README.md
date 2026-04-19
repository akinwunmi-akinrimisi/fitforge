# supabase/

Database migrations and seed stubs for FitForge90.

## Applying migrations

The Supabase instance runs self-hosted on the VPS. Migrations apply directly via `psql` against the Postgres container (or via the Supabase CLI if installed).

### Option A — psql (current)

```bash
# From the VPS, sourcing POSTGRES_URL from ~/.env.fitforge90
psql "$POSTGRES_URL" -f supabase/migrations/0001_initial.sql
```

### Option B — Supabase CLI (preferred once `supabase` binary is on the VPS)

```bash
supabase db push
```

## Conventions

- Every migration file is **idempotent** (uses `if not exists`, `drop … if exists`, `do $$ … exception when duplicate_object then null; end $$` for enums).
- Every migration that creates a table in `public` **enables RLS and adds policies inline in the same file**. Never commit a migration that creates a table without policies.
- `updated_at` columns use the shared `public.set_updated_at()` trigger.
- UUIDs via `gen_random_uuid()` (pgcrypto).

## M1 tables

`profiles`, `exercises`, `plans`, `phases`, `weeks`, `sessions`, `session_exercises`, `foods`.

## Coming in M2

`session_logs`, `set_logs`, `cardio_logs`, `nutrition_entries`, `water_logs`, `body_metrics`, `progress_photos`, `daily_checkins`, `mobility_breaks`, `mobility_logs`, `adaptations`, `pain_notes`, plus the `progress-photos` private Storage bucket with RLS.
