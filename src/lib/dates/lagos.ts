import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ || 'Africa/Lagos'

/** Format a UTC instant in the app's display timezone. */
export function formatLagos(date: Date | string, pattern: string): string {
  return formatInTimeZone(date, APP_TZ, pattern)
}

/** YYYY-MM-DD representation of `date` in the app's display timezone. */
export function lagosDateKey(date: Date | string): string {
  return formatInTimeZone(date, APP_TZ, 'yyyy-MM-dd')
}

/** Today's date key in the app's display timezone. */
export function todayLagosKey(): string {
  return lagosDateKey(new Date())
}

/**
 * Parse a YYYY-MM-DD key (assumed to represent a calendar day in the app's
 * display timezone) and return the UTC instant for 00:00 local.
 */
export function lagosDayStartUtc(dateKey: string): Date {
  const localMidnight = new Date(`${dateKey}T00:00:00`)
  return fromZonedTime(localMidnight, APP_TZ)
}

/** Inverse of `lagosDayStartUtc` for debugging. */
export function utcToLagosLocal(date: Date): Date {
  return toZonedTime(date, APP_TZ)
}

/** ISO-like timestamp in the app's display timezone. Useful for filenames. */
export function lagosTimestamp(date: Date = new Date()): string {
  return formatInTimeZone(date, APP_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX")
}

/** Format relative to the user — short, human. */
export function formatShort(date: Date | string): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'PP')
}

/**
 * App-day boundary (04:00 Lagos) for water + nutrition aggregation.
 *
 * Rationale from docs/specs/nutrition-spec.md: late-night water/snacks should
 * count to the evening they started, not roll into the next day.
 *
 * Returns the UTC [start, end) window for the Lagos calendar day `dateKey`,
 * where "day" = [04:00 on dateKey, 04:00 on dateKey+1) in Africa/Lagos time.
 */
export const APP_DAY_START_HOUR = 4

export function lagosAppDayWindowUtc(dateKey: string): { startUtc: Date; endUtc: Date } {
  const startLocal = new Date(`${dateKey}T${String(APP_DAY_START_HOUR).padStart(2, '0')}:00:00`)
  const endLocal = new Date(startLocal.getTime() + 24 * 60 * 60 * 1000)
  return {
    startUtc: fromZonedTime(startLocal, APP_TZ),
    endUtc: fromZonedTime(endLocal, APP_TZ),
  }
}

/** Which app-day key does a given UTC instant fall into? */
export function appDayKeyForUtc(utc: Date | string): string {
  const inZone = toZonedTime(typeof utc === 'string' ? new Date(utc) : utc, APP_TZ)
  // Subtract the 04:00 offset so values before 04:00 roll back to yesterday.
  const adjusted = new Date(inZone.getTime() - APP_DAY_START_HOUR * 60 * 60 * 1000)
  return formatInTimeZone(fromZonedTime(adjusted, APP_TZ), APP_TZ, 'yyyy-MM-dd')
}

/** Today's app-day key right now. */
export function todayAppDayKey(): string {
  return appDayKeyForUtc(new Date())
}
