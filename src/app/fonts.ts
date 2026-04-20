import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'

/**
 * Display serif — Fraunces variable font.
 * Used for headings, phase names, large numbers (font-display utility).
 * No `weight` / `style` arrays → Next downloads the single variable-font file
 * instead of 8 static files. We don't use italic with this family anywhere.
 */
export const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

/**
 * Body sans — Inter variable font (default when no weight array).
 * TODO(design): swap to Satoshi (self-hosted via next/font/local) once the
 * Fontshare files are added to /public/fonts/. design-system.md explicitly
 * forbids Inter as a long-term choice — this is a bootstrap-only fallback.
 */
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

/**
 * Monospace numeric — JetBrains Mono variable font.
 * Only used via `.numeric` utility for tabular-num weights/reps/macros.
 * No explicit weight usage in the codebase, so variable file is enough.
 */
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
