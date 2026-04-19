import type { WeekComplianceDay } from './types'

export function ComplianceHeatmap({ week }: { week: WeekComplianceDay[] }) {
  const macros: Array<{ key: keyof WeekComplianceDay; label: string }> = [
    { key: 'kcalPct', label: 'kcal' },
    { key: 'proteinPct', label: 'protein' },
    { key: 'carbsPct', label: 'carbs' },
    { key: 'fatPct', label: 'fat' },
  ]

  return (
    <section className="space-y-3 border border-border bg-card p-5">
      <header>
        <p className="section-eyebrow">Last 7 days · vs target</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th scope="col" className="text-left font-normal text-muted-foreground" />
              {week.map((d) => (
                <th
                  key={d.dateKey}
                  scope="col"
                  className="text-center text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {macros.map((m) => (
              <tr key={m.key}>
                <th
                  scope="row"
                  className="pr-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  {m.label}
                </th>
                {week.map((d) => {
                  const pct = Number(d[m.key])
                  const cls = cellClassForPct(pct)
                  return (
                    <td
                      key={d.dateKey}
                      className={`aspect-square h-8 w-8 text-center align-middle text-[11px] font-medium tabular-nums ${cls}`}
                      title={`${pct}% of target on ${d.dateKey}`}
                    >
                      {pct === 0 ? '—' : pct}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Green = within ±5% of target · neutral = within ±15% · red = outside ±15% or no log.
      </p>
    </section>
  )
}

function cellClassForPct(pct: number): string {
  if (pct === 0) return 'bg-primary/10 text-primary'
  const delta = Math.abs(pct - 100)
  if (delta <= 5) return 'bg-accent/30 text-foreground'
  if (delta <= 15) return 'bg-muted text-muted-foreground'
  return 'bg-primary/15 text-primary'
}
