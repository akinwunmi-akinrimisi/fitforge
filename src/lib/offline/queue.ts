'use client'

/**
 * Tiny IndexedDB-backed queue for set_logs that fail to send online.
 *
 * The goal is gym Wi-Fi resilience: any set logged while offline lands in
 * IndexedDB, and a `flushQueue()` call replays it through the existing
 * server action when network returns.
 */

import type { SetLogInput } from '@/domain/log'

const DB_NAME = 'fitforge'
const DB_VERSION = 1
const STORE = 'pending_set_logs'

export type QueuedSetLog = SetLogInput & { id: string; queuedAt: number }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function enqueueSet(input: SetLogInput): Promise<void> {
  const entry: QueuedSetLog = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
  }
  await tx('readwrite', (s) => s.put(entry))
}

export async function listQueued(): Promise<QueuedSetLog[]> {
  return (await tx<QueuedSetLog[]>('readonly', (s) => s.getAll())) ?? []
}

export async function removeQueued(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id))
}

export async function queueSize(): Promise<number> {
  const all = await listQueued()
  return all.length
}
