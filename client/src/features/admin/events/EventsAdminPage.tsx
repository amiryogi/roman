import { Link } from 'react-router';

import type { EventDto } from '@roman/shared';

import {
  ContentListPage,
  type ContentListConfig,
} from '@/features/admin/components/ContentListPage';
import { eventDateParts } from '@/features/events/eventDates';
import { adminKeys, deleteEvent, listEvents, updateEvent } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/public';

const config: ContentListConfig<EventDto> = {
  title: 'Events',
  noun: 'event',
  newPath: '/admin/events/new',
  newLabel: 'Add event',
  listKey: adminKeys.eventList,
  list: listEvents,
  invalidate: [adminKeys.events, ['events'], queryKeys.home],
  update: updateEvent,
  remove: deleteEvent,
  label: (event) => event.title,
  editPath: (event) => `/admin/events/${event.id}`,
  columns: [
    {
      header: 'Event',
      cell: (event) => (
        <div className="min-w-0">
          <Link
            to={`/admin/events/${event.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {event.title}
          </Link>
          <p className="text-xs text-stone-600">
            {event.venue.name}, {event.venue.city}
            {event.eventStatus !== 'scheduled' && ` · ${event.eventStatus}`}
          </p>
        </div>
      ),
    },
    {
      header: 'Date',
      wide: true,
      cell: (event) => {
        const date = eventDateParts(event);
        return (
          <span>
            {date.fullDate}
            <br />
            <span className="text-xs text-stone-600">{date.time}</span>
          </span>
        );
      },
    },
  ],
  deleteMessage: (event) =>
    `“${event.title}” will be removed from the site. Photos linked to it stay in the gallery.`,
  searchLabel: 'Search titles',
  emptyMessage: 'No events yet. Add the next performance.',
};

/** Events are listed by date, newest first; there is no manual ordering. */
export function EventsAdminPage() {
  return <ContentListPage config={config} />;
}
