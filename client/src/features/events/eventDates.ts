import type { EventDto } from '@roman/shared';

export interface EventDateParts {
  /** "Mon", "14", "Nov": the programme-style date block. */
  weekday: string;
  day: string;
  month: string;
  /** "Saturday, 14 November 2026". */
  fullDate: string;
  /** "7:00 pm – 9:00 pm Nepal Time" (end time only when the event ends the same day). */
  time: string;
}

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).format(date);
}

/**
 * Dates and times in the event's own time zone (Asia/Kathmandu by default), labelled with the
 * zone's name, so visitors abroad aren't misled by their own clock (plan §6, ASM-3).
 */
export function eventDateParts(
  event: Pick<EventDto, 'startsAt' | 'endsAt' | 'timezone'>,
): EventDateParts {
  const zone = event.timezone;
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : undefined;
  const time = (date: Date) =>
    parts(date, zone, { hour: 'numeric', minute: '2-digit', hour12: true });
  const zoneName =
    new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'long' })
      .formatToParts(start)
      .find((part) => part.type === 'timeZoneName')?.value ?? zone;
  const sameDay =
    end !== undefined &&
    parts(start, zone, { year: 'numeric', month: '2-digit', day: '2-digit' }) ===
      parts(end, zone, { year: 'numeric', month: '2-digit', day: '2-digit' });

  return {
    weekday: parts(start, zone, { weekday: 'short' }),
    day: parts(start, zone, { day: 'numeric' }),
    month: parts(start, zone, { month: 'short' }),
    fullDate: parts(start, zone, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: `${time(start)}${sameDay ? ` – ${time(end)}` : ''} ${zoneName}`,
  };
}
