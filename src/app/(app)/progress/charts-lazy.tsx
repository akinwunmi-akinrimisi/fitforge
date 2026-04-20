'use client'

/**
 * Lazy-loaded recharts wrappers.
 *
 * Recharts is ~376 KB gzipped and is only ever rendered on /progress.
 * Using next/dynamic with ssr:false defers the chunk until after the
 * first paint, so the initial JS for /progress drops by ~370 KB and
 * LCP on that route improves significantly on throttled mobile (the
 * target device is a Redmi 15 on Xiaomi HyperOS, which eats hydration
 * ~5× harder than Lighthouse's default "4× CPU" simulation).
 */
import dynamic from 'next/dynamic'

const ChartSkeleton = ({ height }: { height: number }) => (
  <div
    className="w-full animate-pulse rounded-sm bg-muted/40"
    style={{ height: `${height}px` }}
    aria-hidden
  />
)

export const WeightChart = dynamic(
  () => import('./weight-chart').then((m) => ({ default: m.WeightChart })),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> },
)

export const StrengthChart = dynamic(
  () => import('./strength-chart').then((m) => ({ default: m.StrengthChart })),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
)
