import type { EventDto } from '@roman/shared';

import { optionalIsoDateTime } from '../../lib/dates.js';
import { toImageDto, toTimestampsDto, type WithId } from '../../lib/mongo.js';
import type { EventDoc } from './model.js';

export function toEventDto(doc: WithId<EventDoc>): EventDto {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    startsAt: doc.startsAt.toISOString(),
    endsAt: optionalIsoDateTime(doc.endsAt),
    timezone: doc.timezone,
    venue: {
      name: doc.venue.name,
      address: doc.venue.address,
      city: doc.venue.city,
      country: doc.venue.country,
    },
    eventStatus: doc.eventStatus,
    ticketUrl: doc.ticketUrl,
    infoUrl: doc.infoUrl,
    image: toImageDto(doc.image),
    status: doc.status,
    featured: doc.featured,
    ...toTimestampsDto(doc),
  };
}
