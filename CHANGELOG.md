# Changelog

All notable changes to FitForge90 are documented here.
Entries follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — M1 Foundations scaffolding
- Next.js 14 App Router + TS strict + Tailwind CSS + shadcn baseline.
- Supabase SSR clients (`client.ts` / `server.ts` / `middleware.ts`) with `server-only` guards on the service-role helper.
- Auth flow: `/login` with magic-link + optional password server actions, `/auth/callback` exchange route, `/auth/sign-out` POST route.
- Protected `(app)` route group with layout + dashboard placeholder. Middleware redirects unauthenticated users.
- Design tokens wired per `docs/build/design-system.md` (Fraunces display / Inter transitional body / JetBrains Mono numeric; dark-default session surface).
- Initial SQL migration `supabase/migrations/0001_initial.sql` — `profiles`, `exercises`, `plans`, `phases`, `weeks`, `sessions`, `session_exercises`, `foods`. RLS enabled on every table in the same migration, policy template from `docs/build/security.md` applied.
- Docker multi-stage production image (non-root) + compose file wired to the existing VPS Traefik (`n8n-traefik-1`, network `n8n_n8n_network`, certresolver `mytlschallenge`) and the `supabase_internal` network.
- GitHub Actions CI: Prettier / lint / typecheck / vitest / build / `pnpm audit`.
- `/api/health` endpoint for Traefik/Docker healthchecks.
- Timezone helpers (`src/lib/dates/lagos.ts`) with unit tests.

### Known gaps (by design, shipped in later milestones)
- Generated Supabase types are stubbed (`Database = any`). Run `pnpm gen:types` after first migration apply.
- Body font is Inter as a transitional default; swap to Satoshi in M3's design pass (see `src/app/fonts.ts` TODO).
- `shadcn/ui` components installed minimally (Button, Input, Label); the rest (`dialog`, `drawer`, `form`, `progress`, `sheet`, `skeleton`, `sonner`, `tabs`, `toggle`) install per-component during M3.
- No seed data yet — `pnpm seed` is a stub until M2.
