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
