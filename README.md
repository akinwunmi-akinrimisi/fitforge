# FitForge90

A 90-day adaptive body-recomposition program — logged daily, recalibrated weekly, within safety rails that can't be overridden.

> Build docs: `docs/build/AGENT.md` · `docs/build/CLAUDE.md` · `docs/build/implementation.md`
> Specs: `docs/specs/*.md`

---

## Local development

```bash
# Pin Node 20 (via nvm)
nvm use

# Install
corepack enable
pnpm install

# Configure
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#      SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL.

# Apply migrations to the self-hosted Supabase (one-off from the VPS)
psql "$POSTGRES_URL" -f supabase/migrations/0001_initial.sql

# Run
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

## Deploy (VPS)

The VPS at `srv1297445.hstgr.cloud` already runs Docker, Traefik (`n8n-traefik-1`), and Supabase self-hosted. `docker-compose.yml` plugs into both networks.

```bash
# On the VPS, once
ssh gridai-vps
mkdir -p /opt/fitforge90 && cd /opt/fitforge90
git clone <repo-url> .
cp .env.example .env     # edit with real secrets

# Apply the initial migration against the Supabase Postgres
psql "$POSTGRES_URL" -f supabase/migrations/0001_initial.sql

# Build + run
docker compose build
docker compose up -d

# Logs
docker compose logs -f app
```

DNS: point `fitforge.operscale.cloud` at the VPS IP (`72.61.201.148`). Traefik handles TLS automatically via the existing `mytlschallenge` resolver on first request.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (standalone build) |
| Language | TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui primitives |
| DB / Auth / Storage | Supabase self-hosted |
| Forms | react-hook-form + zod |
| Server state | @tanstack/react-query v5 |
| Dates | date-fns + date-fns-tz (Africa/Lagos render, UTC storage) |
| Charts | recharts |
| Motion | motion (framer-motion v11) |
| Tests | vitest + Testing Library + Playwright |
| Runtime | Node 20 LTS in Docker, non-root |

## Milestones

Tracked in `docs/build/implementation.md`. Current: **M1 Foundations scaffolded.** Next: **M2 — plan engine + seed data.**

## How the adaptation engine will work (M5)

Every Sunday 23:59 Africa/Lagos a cron-triggered recalibration looks at the past 7 days — sessions logged, nutrition compliance, sleep, pain notes, weigh-in trend — and adjusts next week within hard guardrails (max +2.5 kg/week on lower-body compounds, mandatory deload on weeks 4/8/12, kcal floor 1900, etc.). Every decision writes a human-readable `reasoning` row to the `adaptations` table so the user can see *why* next week looks the way it does. See `docs/specs/adaptation-engine-spec.md`.

## Security

- Service-role Supabase key is server-only — see `src/lib/supabase/server.ts` and the `server-only` guard in `src/lib/env.ts`.
- Every `public` table ships with RLS + policies in the same migration that creates it. Never merge a migration that creates a table without a policy — see `docs/build/security.md`.
- Progress photos (M5) use a **private** Storage bucket with short-lived signed URLs. Paths and URLs are never logged.
- Pre-commit secret scanner (installed by `docs/build/skills.sh`) blocks common secret patterns.
