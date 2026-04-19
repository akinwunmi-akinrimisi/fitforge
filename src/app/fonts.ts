import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'

/**
 * Display serif — Fraunces, variable. Used for headings, phase names, large numbers.
 * Placeholder pending license for Söhne or Gambarino if we upgrade.
 */
export const fontDisplay = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

/**
 * Body sans — currently Inter via Google Fonts as a transitional default.
 * TODO(design): swap to Satoshi (self-hosted via next/font/local) once the
 * Fontshare files are added to /public/fonts/. design-system.md explicitly
 * forbids Inter as a long-term choice — this is a bootstrap-only fallback.
 */
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

/** Monospace numeric — JetBrains Mono with tabular numerals for weights/reps/macros. */
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})
