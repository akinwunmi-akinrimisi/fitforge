/**
 * Phase progress bar — the "unforgettable thing" per design-system.md.
 *
 * 13 week segments, colored by phase, with a day cursor overlaid. Uses the
 * accent color on completed weeks and subtle phase transitions between
 * foundation → build → reveal → peak.
 */
type Props = {
  dayNumber: number // 1-90
}

const PHASE_SEGMENTS = [
  { from: 1, to: 4, name: 'Foundation', color: 'hsl(var(--muted-foreground))' },
  { from: 5, to: 8, name: 'Build', color: 'hsl(var(--foreground))' },
  { from: 9, to: 12, name: 'Reveal', color: 'hsl(var(--primary))' },
  { from: 13, to: 13, name: 'Peak', color: 'hsl(var(--accent))' },
] as const

export function PhaseProgressBar({ dayNumber }: Props) {
  const clampedDay = Math.max(1, Math.min(90, dayNumber))
  const currentWeek = Math.ceil(clampedDay / 7)
  const cursorPct = Math.min(100, (clampedDay / 90) * 100)

  return (
    <div className="space-y-3" aria-label={`Day ${clampedDay} of 90`}>
      <div className="flex items-baseline justify-between">
        <p className="section-eyebrow">
          Day <span className="numeric">{clampedDay}</span> / 90
        </p>
        <p className="section-eyebrow text-muted-foreground">
          Week <span className="numeric">{currentWeek}</span> / 13
        </p>
      </div>

      <div className="relative h-3 w-full border border-border bg-background">
        {/* Week segments */}
        <div className="absolute inset-0 grid grid-cols-13">
          {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => {
            const phase = PHASE_SEGMENTS.find((p) => w >= p.from && w <= p.to)!
            const passed = w < currentWeek
            const current = w === currentWeek
            return (
              <div
                key={w}
                className="relative border-r border-border last:border-r-0"
                style={{
                  background: passed ? phase.color : current ? 'transparent' : 'transparent',
                  opacity: passed ? 0.85 : current ? 1 : 0.15,
                }}
                aria-label={`Week ${w} · ${phase.name}`}
              >
                {current && (
                  <div
                    className="absolute inset-y-0 left-0 bg-primary"
                    style={{ width: `${((clampedDay - (w - 1) * 7) / 7) * 100}%` }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Cursor line — thin, intentional */}
        <div
          className="pointer-events-none absolute top-[-4px] h-[calc(100%+8px)] w-px bg-primary"
          style={{ left: `${cursorPct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {PHASE_SEGMENTS.map((p) => {
          const active = currentWeek >= p.from && currentWeek <= p.to
          return (
            <span key={p.name} className={active ? 'text-foreground' : ''}>
              {p.name}
            </span>
          )
        })}
      </div>
    </div>
  )
}
