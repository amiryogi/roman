import mongoose, { type QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  eventAdminListQuerySchema,
  eventCreateInputSchema,
  EventDto,
  eventsPublicQuerySchema,
  EventTimeframe,
  eventUpdateInputSchema,
  PaginationMeta,
} from '@roman/shared';
import { DEFAULT_TIME_ZONE } from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import type { WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { titleSearch } from '../../lib/query.js';
import { generateUniqueSlug } from '../../lib/slug.js';
import { destroyAll, resolveImageSlot } from '../../services/media/slots.js';
import { GalleryImageModel } from '../gallery/model.js';
import type { MediaDeps } from '../tracks/service.js';
import { toEventDto } from './mapper.js';
import { EventModel, type EventDoc } from './model.js';

type EventCreate = z.output<typeof eventCreateInputSchema>;
type EventUpdate = z.output<typeof eventUpdateInputSchema>;
type PublicQuery = z.output<typeof eventsPublicQuerySchema>;
type AdminQuery = z.output<typeof eventAdminListQuerySchema>;

interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * "Upcoming" and "past" are computed from the dates on every request, never stored, so an event
 * moves to the past by itself (plan §8.3). An event that has started but not ended is upcoming.
 */
export function timeframeFilter(when: EventTimeframe, now: Date): QueryFilter<EventDoc> {
  return when === 'upcoming'
    ? {
        $or: [
          { startsAt: mongoose.trusted({ $gte: now }) },
          { endsAt: mongoose.trusted({ $gte: now }) },
        ],
      }
    : {
        startsAt: mongoose.trusted({ $lt: now }),
        endsAt: mongoose.trusted({ $not: { $gte: now } }),
      };
}

/** Upcoming soonest first, past most recent first. */
function sortFor(when: EventTimeframe | undefined): Record<string, 1 | -1> {
  return when === 'upcoming' ? { startsAt: 1, _id: 1 } : { startsAt: -1, _id: 1 };
}

async function page(
  filter: QueryFilter<EventDoc>,
  query: { page: number; limit: number },
  sort: Record<string, 1 | -1>,
): Promise<Page<EventDto>> {
  const [docs, total] = await Promise.all([
    EventModel.find(filter)
      .sort(sort)
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<EventDoc>[]>(),
    EventModel.countDocuments(filter),
  ]);
  return { items: docs.map(toEventDto), meta: paginationMeta(query.page, query.limit, total) };
}

function assertEndsAfterStart(startsAt: Date, endsAt: Date | undefined): void {
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw AppError.validation('The end must be after the start.', [
      { path: 'endsAt', message: 'The end must be after the start' },
    ]);
  }
}

// --- Public ---------------------------------------------------------------------------------

/** `GET /api/events?when=upcoming|past` (plan §10.2). */
export function listPublicEvents(query: PublicQuery, now = new Date()): Promise<Page<EventDto>> {
  return page(
    { status: 'published', ...timeframeFilter(query.when, now) },
    query,
    sortFor(query.when),
  );
}

export async function listUpcomingEvents(limit: number, now = new Date()): Promise<EventDto[]> {
  const docs = await EventModel.find({ status: 'published', ...timeframeFilter('upcoming', now) })
    .sort(sortFor('upcoming'))
    .limit(limit)
    .lean<WithId<EventDoc>[]>();
  return docs.map(toEventDto);
}

// --- Admin ----------------------------------------------------------------------------------

export function listAdminEvents(query: AdminQuery, now = new Date()): Promise<Page<EventDto>> {
  const filter: QueryFilter<EventDoc> = {
    ...titleSearch(query.q),
    ...(query.when ? timeframeFilter(query.when, now) : {}),
  };
  if (query.status) filter.status = query.status;
  return page(filter, query, sortFor(query.when));
}

export async function getAdminEvent(id: string): Promise<EventDto> {
  const doc = await EventModel.findById(id).lean<WithId<EventDoc>>();
  if (!doc) throw AppError.notFound('This event no longer exists.');
  return toEventDto(doc);
}

export async function createEvent(input: EventCreate, { media, logger }: MediaDeps) {
  const image = await resolveImageSlot(media, 'event', input.image, undefined, logger, 'image');
  const slug =
    input.slug ??
    (await generateUniqueSlug(input.title, async (candidate) =>
      Boolean(await EventModel.exists({ slug: candidate })),
    ));
  const created = await EventModel.create({
    title: input.title,
    slug,
    description: input.description ?? undefined,
    startsAt: new Date(input.startsAt),
    endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    timezone: input.timezone ?? DEFAULT_TIME_ZONE,
    venue: input.venue,
    eventStatus: input.eventStatus,
    ticketUrl: input.ticketUrl ?? undefined,
    infoUrl: input.infoUrl ?? undefined,
    image: image.value,
    status: input.status,
    featured: input.featured,
  });
  return getAdminEvent(created._id.toHexString());
}

export async function updateEvent(
  id: string,
  input: EventUpdate,
  { media, logger }: MediaDeps,
): Promise<EventDto> {
  const doc = await EventModel.findById(id);
  if (!doc) throw AppError.notFound('This event no longer exists.');

  if (input.title !== undefined) doc.title = input.title;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.description !== undefined) doc.description = input.description ?? undefined;
  if (input.startsAt !== undefined) doc.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) doc.endsAt = input.endsAt ? new Date(input.endsAt) : undefined;
  if (input.timezone !== undefined) doc.timezone = input.timezone;
  if (input.venue !== undefined) doc.venue = input.venue;
  if (input.eventStatus !== undefined) doc.eventStatus = input.eventStatus;
  if (input.ticketUrl !== undefined) doc.ticketUrl = input.ticketUrl ?? undefined;
  if (input.infoUrl !== undefined) doc.infoUrl = input.infoUrl ?? undefined;
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = input.featured;
  // When only one of the two dates changes, the merged result must still make sense.
  assertEndsAfterStart(doc.startsAt, doc.endsAt);

  const image = await resolveImageSlot(media, 'event', input.image, doc.image, logger, 'image');
  doc.image = image.value;

  await doc.save();
  await destroyAll(media, image.obsolete, logger);
  return getAdminEvent(id);
}

/** Photos linked to the event stay in the gallery, unlinked. */
export async function deleteEvent(id: string, { media, logger }: MediaDeps): Promise<void> {
  const doc = await EventModel.findByIdAndDelete(id).lean<WithId<EventDoc>>();
  if (!doc) throw AppError.notFound('This event no longer exists.');
  await GalleryImageModel.updateMany({ event: doc._id }, { $unset: { event: 1 } });
  await destroyAll(media, doc.image ? [doc.image.asset] : [], logger);
}
