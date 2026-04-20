'use client'

import { logSet } from '@/app/(app)/session/actions'
import { listQueued, removeQueued } from './queue'

export type FlushResult = {
  attempted: number
  synced: number
  failed: number
}

/**
 * Replay every queued set-log through the server action. Returns counts.
 * Safe to call repeatedly; uses the server action's upsert semantics on
 * `(session_exercise_id, set_number)` to avoid duplicates.
 */
export async function flushQueue(): Promise<FlushResult> {
  const queued = await listQueued()
  let synced = 0
  let failed = 0
  for (const item of queued) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, queuedAt: _q, ...input } = item
    const res = await logSet(input)
    if (res.ok) {
      await removeQueued(item.id)
      synced++
    } else {
      failed++
    }
  }
  return { attempted: queued.length, synced, failed }
}
