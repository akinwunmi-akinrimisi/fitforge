import type { Metadata, Viewport } from 'next'
import { fontDisplay, fontMono, fontSans } from './fonts'
import { cn } from '@/lib/utils'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FitForge90',
    template: '%s — FitForge90',
  },
  description:
    'A 90-day adaptive training and nutrition program. Logs what you did, adjusts next week to match.',
  applicationName: 'FitForge90',
  formatDetection: { telephone: false, date: false, address: false, email: false, url: false },
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F1EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(fontDisplay.variable, fontSans.variable, fontMono.variable)}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
