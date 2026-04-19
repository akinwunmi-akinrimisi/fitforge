import type { WarmupBlockJson } from './types'

export function WarmupCard({ warmup }: { warmup: NonNullable<WarmupBlockJson> }) {
  return (
    <section className="space-y-3 border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-baseline justify-between gap-3">
        <p className="section-eyebrow">Warm-up · {warmup.durationMinutes} min</p>
        {warmup.mandatory && (
          <span className="text-[10px] uppercase tracking-widest text-primary">Mandatory</span>
        )}
      </div>
      <ul className="prose-readable grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        {warmup.exerciseSlugs.map((s) => (
          <li key={s}>· {humanize(s)}</li>
        ))}
      </ul>
    </section>
  )
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
