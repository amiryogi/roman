import mongoose, { Types, type QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  galleryAdminListQuerySchema,
  galleryImageCreateInputSchema,
  GalleryImageDto,
  galleryImageUpdateInputSchema,
  galleryPublicQuerySchema,
  PaginationMeta,
} from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import { fromIsoDate } from '../../lib/dates.js';
import type { WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { reorder } from '../../lib/query.js';
import { destroyAll, resolveMediaRef } from '../../services/media/slots.js';
import { EventModel } from '../events/model.js';
import type { MediaDeps } from '../tracks/service.js';
import { toGalleryImageDto } from './mapper.js';
import { GalleryImageModel, type GalleryImageDoc } from './model.js';

type ImageCreate = z.output<typeof galleryImageCreateInputSchema>;
type ImageUpdate = z.output<typeof galleryImageUpdateInputSchema>;
type PublicQuery = z.output<typeof galleryPublicQuerySchema>;
type AdminQuery = z.output<typeof galleryAdminListQuerySchema>;

interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

async function page(
  filter: QueryFilter<GalleryImageDoc>,
  query: { page: number; limit: number },
): Promise<Page<GalleryImageDto>> {
  const [docs, total] = await Promise.all([
    GalleryImageModel.find(filter)
      .sort({ sortOrder: 1, _id: 1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<GalleryImageDoc>[]>(),
    GalleryImageModel.countDocuments(filter),
  ]);
  return {
    items: docs.map(toGalleryImageDto),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

async function eventRef(eventId: string | null | undefined): Promise<Types.ObjectId | undefined> {
  if (!eventId) return undefined;
  if (!(await EventModel.exists({ _id: eventId }))) {
    throw AppError.validation('The selected event no longer exists.', [
      { path: 'eventId', message: 'Choose an existing event' },
    ]);
  }
  return new Types.ObjectId(eventId);
}

// --- Public ---------------------------------------------------------------------------------

/** `GET /api/gallery` (plan §10.2): published photos, optionally one category. */
export function listPublicImages(query: PublicQuery): Promise<Page<GalleryImageDto>> {
  const filter: QueryFilter<GalleryImageDoc> = { status: 'published' };
  if (query.category) filter.category = query.category;
  return page(filter, query);
}

export async function listFeaturedImages(limit: number): Promise<GalleryImageDto[]> {
  const docs = await GalleryImageModel.find({ status: 'published', featured: true })
    .sort({ sortOrder: 1 })
    .limit(limit)
    .lean<WithId<GalleryImageDoc>[]>();
  return docs.map(toGalleryImageDto);
}

// --- Admin ----------------------------------------------------------------------------------

/** Admin search matches alt text and captions; photos have no title. */
export function listAdminImages(query: AdminQuery): Promise<Page<GalleryImageDto>> {
  const filter: QueryFilter<GalleryImageDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.q) {
    const pattern = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Operators written here must be trusted, or sanitizeFilter neutralises them.
    filter.$or = [
      { alt: mongoose.trusted({ $regex: pattern, $options: 'i' }) },
      { caption: mongoose.trusted({ $regex: pattern, $options: 'i' }) },
    ];
  }
  return page(filter, query);
}

export async function getAdminImage(id: string): Promise<GalleryImageDto> {
  const doc = await GalleryImageModel.findById(id).lean<WithId<GalleryImageDoc>>();
  if (!doc) throw AppError.notFound('This photo no longer exists.');
  return toGalleryImageDto(doc);
}

export async function createImage(input: ImageCreate, { media, logger }: MediaDeps) {
  const event = await eventRef(input.eventId);
  const image = await resolveMediaRef(media, 'gallery', input.image, undefined, logger);
  const created = await GalleryImageModel.create({
    image: image.value,
    alt: input.alt,
    caption: input.caption ?? undefined,
    category: input.category,
    event,
    takenAt: input.takenAt ? fromIsoDate(input.takenAt) : undefined,
    photographerCredit: input.photographerCredit ?? undefined,
    status: input.status,
    featured: input.featured,
  });
  return getAdminImage(created._id.toHexString());
}

export async function updateImage(
  id: string,
  input: ImageUpdate,
  { media, logger }: MediaDeps,
): Promise<GalleryImageDto> {
  const doc = await GalleryImageModel.findById(id);
  if (!doc) throw AppError.notFound('This photo no longer exists.');

  if (input.alt !== undefined) doc.alt = input.alt;
  if (input.caption !== undefined) doc.caption = input.caption ?? undefined;
  if (input.category !== undefined) doc.category = input.category;
  if (input.eventId !== undefined) doc.event = await eventRef(input.eventId);
  if (input.takenAt !== undefined) {
    doc.takenAt = input.takenAt ? fromIsoDate(input.takenAt) : undefined;
  }
  if (input.photographerCredit !== undefined) {
    doc.photographerCredit = input.photographerCredit ?? undefined;
  }
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = input.featured;

  const image = input.image
    ? await resolveMediaRef(media, 'gallery', input.image, doc.image, logger)
    : { value: doc.image, obsolete: [] };
  doc.image = image.value;

  await doc.save();
  await destroyAll(media, image.obsolete, logger);
  return getAdminImage(id);
}

export async function deleteImage(id: string, { media, logger }: MediaDeps): Promise<void> {
  const doc = await GalleryImageModel.findByIdAndDelete(id).lean<WithId<GalleryImageDoc>>();
  if (!doc) throw AppError.notFound('This photo no longer exists.');
  await destroyAll(media, [doc.image], logger);
}

export function reorderImages(ids: readonly string[]): Promise<void> {
  return reorder(GalleryImageModel, ids);
}
