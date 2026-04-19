'use client'

import { Flag } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { ExerciseLibraryRow } from './types'
import { PainFlagDialog } from './pain-flag-dialog'

export function ExerciseDetailDrawer({
  library,
  sessionId,
  sessionExerciseId,
}: {
  library: ExerciseLibraryRow
  sessionId: string
  sessionExerciseId: string
}) {
  return (
    <Drawer>
      <div className="flex items-center gap-2">
        <DrawerTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Details
          </Button>
        </DrawerTrigger>
        <PainFlagDialog sessionId={sessionId} sessionExerciseId={sessionExerciseId}>
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-widest">Flag pain</span>
          </Button>
        </PainFlagDialog>
      </div>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{library.name}</DrawerTitle>
          <DrawerDescription>
            <span className="section-eyebrow">
              {library.category} · {library.primary_muscles.join(' · ')}
            </span>
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 pb-8 pt-2">
          <div className="space-y-8">
            <section className="space-y-2">
              <p className="section-eyebrow">Posture cues</p>
              <ol className="prose-readable ml-4 list-decimal space-y-1 text-sm">
                {library.posture_cues.map((cue, i) => (
                  <li key={i}>{cue}</li>
                ))}
              </ol>
            </section>

            <section className="space-y-2">
              <p className="section-eyebrow">Movement</p>
              <ol className="prose-readable ml-4 list-decimal space-y-2 text-sm">
                {library.movement_steps.map((step, i) => (
                  <li key={i}>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {step.phase}
                    </span>
                    <span> — {step.instruction}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <p className="section-eyebrow">Benefits</p>
              <Tabs defaultValue="physiological">
                <TabsList>
                  <TabsTrigger value="physiological">Physiological</TabsTrigger>
                  {library.benefits.aesthetic && library.benefits.aesthetic.length > 0 && (
                    <TabsTrigger value="aesthetic">Aesthetic</TabsTrigger>
                  )}
                  {library.benefits.functional && library.benefits.functional.length > 0 && (
                    <TabsTrigger value="functional">Functional</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="physiological">
                  <ul className="prose-readable ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                    {(library.benefits.physiological ?? []).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="aesthetic">
                  <ul className="prose-readable ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                    {(library.benefits.aesthetic ?? []).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="functional">
                  <ul className="prose-readable ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                    {(library.benefits.functional ?? []).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </section>

            <section className="space-y-2 border border-primary/40 bg-primary/5 p-4">
              <p className="section-eyebrow text-primary">Safety warnings</p>
              <ul className="prose-readable ml-4 list-disc space-y-1 text-sm">
                {library.safety_warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>

            {library.contraindications.length > 0 && (
              <section className="space-y-2">
                <p className="section-eyebrow">When NOT to do this</p>
                <ul className="prose-readable ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  {library.contraindications.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 border border-accent/40 p-4">
                <p className="section-eyebrow text-accent">Green flags</p>
                <ul className="prose-readable ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  {(library.body_changes_to_watch.green_flags ?? []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2 border border-primary/40 p-4">
                <p className="section-eyebrow text-primary">Red flags</p>
                <ul className="prose-readable ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  {(library.body_changes_to_watch.red_flags ?? []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <p className="section-eyebrow">Common mistakes</p>
              <div className="space-y-3 text-sm">
                {library.common_mistakes.map((m, i) => (
                  <div key={i} className="border-l-2 border-border pl-3">
                    <p className="text-foreground">{m.mistake}</p>
                    <p className="text-muted-foreground">→ {m.correction}</p>
                  </div>
                ))}
              </div>
            </section>

            {(library.regression_slug || library.progression_slug) && (
              <section className="flex gap-6 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
                {library.regression_slug && (
                  <span>Regression: {humanize(library.regression_slug)}</span>
                )}
                {library.progression_slug && (
                  <span>Progression: {humanize(library.progression_slug)}</span>
                )}
              </section>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
