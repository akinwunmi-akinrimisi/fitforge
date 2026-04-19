# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# FitForge90 — multi-stage production image
# Non-root runtime, Next.js standalone output, Alpine-based.
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20.20.2

# -----------------------------------------------------------------------------
# 1. Base — shared pnpm + corepack setup
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

# -----------------------------------------------------------------------------
# 2. Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
# Use a bind-mount + cache for pnpm store to keep final image small.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    PNPM_STORE_DIR=/pnpm/store pnpm install --frozen-lockfile --prod=false

# -----------------------------------------------------------------------------
# 3. Build
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public env must be available at build time to be baked into the client bundle.
# Passed via `docker compose build --build-arg`.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_TZ
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_APP_TZ=$NEXT_PUBLIC_APP_TZ
RUN pnpm build

# -----------------------------------------------------------------------------
# 4. Runner — minimal, non-root
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Next.js standalone writes a server.js at the project root.
CMD ["node", "server.js"]
