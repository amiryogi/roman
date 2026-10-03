import type { QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  PaginationMeta,
  videoAdminListQuerySchema,
  videoCreateInputSchema,
  VideoDto,
  videosPublicQuerySchema,
  videoUpdateInputSchema,
} from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import { fromIsoDate } from '../../lib/dates.js';
import type { WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { reorder, titleSearch } from '../../lib/query.js';
import { generateUniqueSlug } from '../../lib/slug.js';
import type { AssetRef } from '../../services/media/MediaService.js';
import { destroyAll, resolveImageSlot, resolveMediaRef } from '../../services/media/slots.js';
import type { MediaDeps } from '../tracks/service.js';
import { toVideoDto } from './mapper.js';
import { VideoModel, type VideoDoc } from './model.js';

type VideoCreate = z.output<typeof videoCreateInputSchema>;
type VideoUpdate = z.output<typeof videoUpdateInputSchema>;
type PublicQuery = z.output<typeof videosPublicQuerySchema>;
type AdminQuery = z.output<typeof videoAdminListQuerySchema>;

interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

async function findLean(id: string): Promise<WithId<VideoDoc>> {
  const doc = await VideoModel.findById(id).lean<WithId<VideoDoc>>();
  if (!doc) throw AppError.notFound('This video no longer exists.');
  return doc;
}

async function page(
  filter: QueryFilter<VideoDoc>,
  query: { page: number; limit: number },
): Promise<Page<VideoDto>> {
  const [docs, total] = await Promise.all([
    VideoModel.find(filter)
      .sort({ sortOrder: 1, _id: 1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<VideoDoc>[]>(),
    VideoModel.countDocuments(filter),
  ]);
  return { items: docs.map(toVideoDto), meta: paginationMeta(query.page, query.limit, total) };
}

// --- Public ---------------------------------------------------------------------------------

/** `GET /api/videos` (plan §10.2): published videos, optionally one category. */
export function listPublicVideos(query: PublicQuery): Promise<Page<VideoDto>> {
  const filter: QueryFilter<VideoDoc> = { status: 'published' };
  if (query.category) filter.category = query.category;
  return page(filter, query);
}

export async function listFeaturedVideos(limit: number): Promise<VideoDto[]> {
  const docs = await VideoModel.find({ status: 'published', featured: true })
    .sort({ sortOrder: 1 })
    .limit(limit)
    .lean<WithId<VideoDoc>[]>();
  return docs.map(toVideoDto);
}

// --- Admin ----------------------------------------------------------------------------------

export function listAdminVideos(query: AdminQuery): Promise<Page<VideoDto>> {
  const filter: QueryFilter<VideoDoc> = { ...titleSearch(query.q) };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  return page(filter, query);
}

export async function getAdminVideo(id: string): Promise<VideoDto> {
  return toVideoDto(await findLean(id));
}

export async function createVideo(input: VideoCreate, { media, logger }: MediaDeps) {
  const poster = await resolveImageSlot(
    media,
    'video-poster',
    input.poster,
    undefined,
    logger,
    'poster',
  );
  const source =
    input.source === 'cloudinary'
      ? await (async () => {
          const video = await resolveMediaRef(media, 'video', input.mediaRef, undefined, logger);
          return { media: video.value, duration: video.value.duration };
        })()
      : { youtubeId: input.youtube };
  const slug =
    input.slug ??
    (await generateUniqueSlug(input.title, async (candidate) =>
      Boolean(await VideoModel.exists({ slug: candidate })),
    ));

  const created = await VideoModel.create({
    title: input.title,
    slug,
    description: input.description ?? undefined,
    source: input.source,
    ...source,
    poster: poster.value,
    category: input.category,
    recordedAt: input.recordedAt ? fromIsoDate(input.recordedAt) : undefined,
    venue: input.venue ?? undefined,
    status: input.status,
    featured: input.featured,
  });
  return getAdminVideo(created._id.toHexString());
}

/**
 * Partial update. The video can switch between an uploaded file and YouTube: the new source's
 * field is then required, and the previous upload is deleted after saving.
 */
export async function updateVideo(
  id: string,
  input: VideoUpdate,
  { media, logger }: MediaDeps,
): Promise<VideoDto> {
  const doc = await VideoModel.findById(id);
  if (!doc) throw AppError.notFound('This video no longer exists.');
  const obsolete: AssetRef[] = [];

  if (input.title !== undefined) doc.title = input.title;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.description !== undefined) doc.description = input.description ?? undefined;
  if (input.category !== undefined) doc.category = input.category;
  if (input.recordedAt !== undefined) {
    doc.recordedAt = input.recordedAt ? fromIsoDate(input.recordedAt) : undefined;
  }
  if (input.venue !== undefined) doc.venue = input.venue ?? undefined;
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = input.featured;

  const source = input.source ?? doc.source;
  if (source === 'cloudinary') {
    if (input.youtube !== undefined) {
      throw AppError.validation('A YouTube link only applies to YouTube videos.', [
        { path: 'youtube', message: 'Choose "YouTube" as the source' },
      ]);
    }
    if (input.mediaRef) {
      const current = doc.source === 'cloudinary' ? doc.media : undefined;
      const video = await resolveMediaRef(media, 'video', input.mediaRef, current, logger);
      doc.media = video.value;
      doc.duration = video.value.duration;
      obsolete.push(...video.obsolete);
    } else if (doc.source !== 'cloudinary') {
      throw AppError.validation('Upload the video file.', [
        { path: 'mediaRef', message: 'Upload the video file' },
      ]);
    }
    doc.youtubeId = undefined;
  } else {
    if (input.mediaRef !== undefined) {
      throw AppError.validation('An uploaded file only applies to uploaded videos.', [
        { path: 'mediaRef', message: 'Choose "Upload" as the source' },
      ]);
    }
    if (input.youtube !== undefined) {
      doc.youtubeId = input.youtube;
    } else if (doc.source !== 'youtube') {
      throw AppError.validation('Enter the YouTube link.', [
        { path: 'youtube', message: 'Enter the YouTube link' },
      ]);
    }
    if (doc.media)
      obsolete.push({ publicId: doc.media.publicId, resourceType: doc.media.resourceType });
    doc.media = undefined;
    doc.duration = undefined;
  }
  doc.source = source;

  const poster = await resolveImageSlot(
    media,
    'video-poster',
    input.poster,
    doc.poster,
    logger,
    'poster',
  );
  doc.poster = poster.value;
  obsolete.push(...poster.obsolete);

  await doc.save();
  await destroyAll(media, obsolete, logger);
  return getAdminVideo(id);
}

export async function deleteVideo(id: string, { media, logger }: MediaDeps): Promise<void> {
  const doc = await VideoModel.findByIdAndDelete(id).lean<WithId<VideoDoc>>();
  if (!doc) throw AppError.notFound('This video no longer exists.');
  await destroyAll(
    media,
    [...(doc.media ? [doc.media] : []), ...(doc.poster ? [doc.poster.asset] : [])],
    logger,
  );
}

export function reorderVideos(ids: readonly string[]): Promise<void> {
  return reorder(VideoModel, ids);
}
