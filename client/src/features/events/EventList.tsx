import type { EventDto } from '@roman/shared';

import { eventDateParts } from './eventDates';

const STATUS_LABELS = { postponed: 'Postponed', cancelled: 'Cancelled' } as const;

/** Events as a printed concert programme (plan §6): date block, title, time, venue, links. */
export function EventList({
  events,
  headingLevel = 3,
}: {
  events: EventDto[];
  headingLevel?: 2 | 3;
}) {
  return (
    <ol className="divide-y divide-current/15 border-y border-current/15">
      {events.map((event) => (
        <li key={event.id}>
          <EventItem event={event} headingLevel={headingLevel} />
        </li>
      ))}
    </ol>
  );
}

function EventItem({ event, headingLevel }: { event: EventDto; headingLevel: 2 | 3 }) {
  const date = eventDateParts(event);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const place = [event.venue.address, event.venue.city, event.venue.country]
    .filter(Boolean)
    .join(', ');
  const status = event.eventStatus === 'scheduled' ? undefined : STATUS_LABELS[event.eventStatus];
  const link =
    'inline-flex min-h-11 items-center text-sm font-medium tracking-[0.14em] text-(--accent) uppercase underline decoration-current/40 underline-offset-[6px] hover:decoration-current';

  return (
    // Anchors (/events#slug) give each event a shareable address (plan §8.4, ADR-9).
    <article
      id={event.slug}
      aria-labelledby={`${event.slug}-title`}
      className="grid scroll-mt-28 grid-cols-[4.5rem_1fr] gap-x-6 gap-y-2 py-8 sm:grid-cols-[6rem_1fr] sm:gap-x-10"
    >
      <time
        dateTime={event.startsAt}
        className={`flex flex-col items-center border-r border-current/20 pr-6 text-center ${status === 'Cancelled' ? 'opacity-60' : ''}`}
      >
        <span className="label-caps text-(--muted)">{date.weekday}</span>
        <span className="font-display text-[2.75rem] leading-none font-medium">{date.day}</span>
        <span className="label-caps text-(--accent)">{date.month}</span>
      </time>
      <div className="min-w-0">
        {status && (
          <p className="mb-2 inline-flex rounded-sm border border-current px-2 py-0.5 text-xs font-medium tracking-wide uppercase">
            {status}
          </p>
        )}
        <Heading
          id={`${event.slug}-title`}
          className={`font-display text-[1.75rem] leading-tight font-medium ${status === 'Cancelled' ? 'line-through decoration-1' : ''}`}
        >
          {event.title}
        </Heading>
        <p className="mt-2 text-(--muted)">
          {date.fullDate} · {date.time}
        </p>
        <p className="mt-1">
          <span className="font-medium">{event.venue.name}</span>
          {place && <span className="text-(--muted)">, {place}</span>}
        </p>
        {event.description && (
          <p className="mt-4 max-w-2xl leading-relaxed text-(--muted)">{event.description}</p>
        )}
        {(event.ticketUrl ?? event.infoUrl) && status !== 'Cancelled' && (
          <div className="mt-4 flex flex-wrap gap-x-6">
            {event.ticketUrl && (
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className={link}>
                Tickets<span className="sr-only"> for {event.title} (opens in a new tab)</span>
              </a>
            )}
            {event.infoUrl && (
              <a href={event.infoUrl} target="_blank" rel="noopener noreferrer" className={link}>
                More information
                <span className="sr-only"> about {event.title} (opens in a new tab)</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
