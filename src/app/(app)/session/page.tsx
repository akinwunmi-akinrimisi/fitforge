import { redirect } from 'next/navigation'
import { todayLagosKey } from '@/lib/dates/lagos'

export const dynamic = 'force-dynamic'

export default function SessionIndex() {
  redirect(`/session/${todayLagosKey()}`)
}
