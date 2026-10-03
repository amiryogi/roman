/**
 * Conversions between UTC instants and wall-clock time in an IANA time zone, using only Intl.
 * Event times are entered in the event's own zone (Asia/Kathmandu by default) and stored in UTC
 * (plan §8.3, ASM-3).
 */

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Minutes the zone is ahead of UTC at `date`, e.g. 345 for Asia/Kathmandu (+05:45). */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  const wallAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return Math.round((wallAsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/**
 * "2026-11-02T19:00" (as shown by `<input type="datetime-local">`) in `timeZone` → UTC ISO string.
 * Returns undefined for anything that isn't such a value.
 */
export function zonedLocalToIso(local: string, timeZone: string): string | undefined {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match.map(Number);
  if (year === undefined || month === undefined || day === undefined) return undefined;
  const wallAsUtc = Date.UTC(year, month - 1, day, hour ?? 0, minute ?? 0);
  // Two passes settle the offset around daylight-saving changes.
  let instant = wallAsUtc - zoneOffsetMinutes(new Date(wallAsUtc), timeZone) * 60_000;
  instant = wallAsUtc - zoneOffsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant).toISOString();
}

/** UTC ISO string → "2026-11-02T19:00" in `timeZone`, for `<input type="datetime-local">`. */
export function isoToZonedLocal(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const shifted = new Date(date.getTime() + zoneOffsetMinutes(date, timeZone) * 60_000);
  return shifted.toISOString().slice(0, 16);
}
