'use client'

import type { MacroTargets, MacroTotals } from './types'

export function MacroRing({ targets, totals }: { targets: MacroTargets; totals: MacroTotals }) {
  const kcalPct = clamp(totals.kcal / targets.kcal)
  const proteinPct = clamp(totals.proteinG / targets.proteinG)
  const carbsPct = clamp(totals.carbsG / targets.carbsG)
  const fatPct = clamp(totals.fatG / targets.fatG)

  // Inline SVG — four concentric rings.
  const size = 220
  const strokeWidth = 14
  const gap = 2
  const ringSpecs = [
    {
      label: 'kcal',
      pct: kcalPct,
      color: 'hsl(var(--primary))',
      radius: size / 2 - strokeWidth / 2 - 4,
    },
    {
      label: 'protein',
      pct: proteinPct,
      color: 'hsl(var(--accent))',
      radius: size / 2 - strokeWidth / 2 - 4 - (strokeWidth + gap),
    },
    {
      label: 'carbs',
      pct: carbsPct,
      color: 'hsl(var(--muted-foreground))',
      radius: size / 2 - strokeWidth / 2 - 4 - (strokeWidth + gap) * 2,
    },
    {
      label: 'fat',
      pct: fatPct,
      color: 'hsl(var(--foreground))',
      radius: size / 2 - strokeWidth / 2 - 4 - (strokeWidth + gap) * 3,
    },
  ]

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Macros ring"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {ringSpecs.map((ring) => {
            const c = 2 * Math.PI * ring.radius
            const dash = c * ring.pct
            return (
              <g key={ring.label}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ring.radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth={strokeWidth}
                  opacity="0.3"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${c}`}
                  strokeLinecap="round"
                />
              </g>
            )
          })}
        </g>
        <text
          x={size / 2}
          y={size / 2 - 6}
          textAnchor="middle"
          className="numeric fill-foreground font-display"
          style={{ fontSize: 28, fontWeight: 600 }}
        >
          {totals.kcal}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          / {targets.kcal} kcal
        </text>
      </svg>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-1">
        <MacroLine
          label="Protein"
          actual={totals.proteinG}
          target={targets.proteinG}
          unit="g"
          color="hsl(var(--accent))"
        />
        <MacroLine
          label="Carbs"
          actual={totals.carbsG}
          target={targets.carbsG}
          unit="g"
          color="hsl(var(--muted-foreground))"
        />
        <MacroLine
          label="Fat"
          actual={totals.fatG}
          target={targets.fatG}
          unit="g"
          color="hsl(var(--foreground))"
        />
        <MacroLine
          label="kcal"
          actual={totals.kcal}
          target={targets.kcal}
          unit=""
          color="hsl(var(--primary))"
        />
      </dl>
    </div>
  )
}

function MacroLine({
  label,
  actual,
  target,
  unit,
  color,
}: {
  label: string
  actual: number
  target: number
  unit: string
  color: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2" style={{ background: color }} aria-hidden="true" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <span className="numeric tabular-nums">
        {actual}
        {unit}{' '}
        <span className="text-muted-foreground">
          / {target}
          {unit}
        </span>
      </span>
    </div>
  )
}

function clamp(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0
  if (v > 1) return 1
  return v
}
