import { Types, type QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  albumAdminListQuerySchema,
  albumCreateInputSchema,
  AlbumDetailDto,
  AlbumDto,
  albumsPublicQuerySchema,
  albumUpdateInputSchema,
  PaginationMeta,
} from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import { fromIsoDate } from '../../lib/dates.js';
import type { WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { reorder, titleSearch } from '../../lib/query.js';
import { generateUniqueSlug } from '../../lib/slug.js';
import type { AssetRef } from '../../services/media/MediaService.js';
import { destroyAll, resolveImageSlot } from '../../services/media/slots.js';
import { TrackModel } from '../tracks/model.js';
import { listPublishedAlbumTracks, type MediaDeps } from '../tracks/service.js';
import { toAlbumDto } from './mapper.js';
import { AlbumModel, type AlbumDoc } from './model.js';

type AlbumCreate = z.output<typeof albumCreateInputSchema>;
type AlbumUpdate = z.output<typeof albumUpdateInputSchema>;
type PublicQuery = z.output<typeof albumsPublicQuerySchema>;
type AdminQuery = z.output<typeof albumAdminListQuerySchema>;

interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Tracks per album. Public counts include only published tracks. */
async function trackCounts(
  albumIds: Types.ObjectId[],
  { publishedOnly }: { publishedOnly: boolean },
): Promise<Map<string, number>> {
  if (albumIds.length === 0) return new Map();
  const rows = await TrackModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: { album: { $in: albumIds }, ...(publishedOnly ? { status: 'published' } : {}) },
    },
    { $group: { _id: '$album', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toHexString(), row.count]));
}

async function toDtos(
  docs: WithId<AlbumDoc>[],
  options: { publishedOnly: boolean },
): Promise<AlbumDto[]> {
  const counts = await trackCounts(
    docs.map((doc) => doc._id),
    options,
  );
  return docs.map((doc) => toAlbumDto(doc, counts.get(doc._id.toHexString()) ?? 0));
}

// --- Public ---------------------------------------------------------------------------------

/** `GET /api/albums`: published albums in manual order, with their published track counts. */
export async function listPublicAlbums(query: PublicQuery): Promise<Page<AlbumDto>> {
  const filter: QueryFilter<AlbumDoc> = { status: 'published' };
  const [docs, total] = await Promise.all([
    AlbumModel.find(filter)
      .sort({ sortOrder: 1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<AlbumDoc>[]>(),
    AlbumModel.countDocuments(filter),
  ]);
  return {
    items: await toDtos(docs, { publishedOnly: true }),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

/** `GET /api/albums/:slug`: 404 for unknown or draft albums. */
export async function getPublicAlbum(slug: string): Promise<AlbumDetailDto> {
  const doc = await AlbumModel.findOne({ slug, status: 'published' }).lean<WithId<AlbumDoc>>();
  if (!doc) throw AppError.notFound('This album is not available.');
  const tracks = await listPublishedAlbumTracks(doc._id);
  return { ...toAlbumDto(doc, tracks.length), tracks };
}

// --- Admin ----------------------------------------------------------------------------------

export async function listAdminAlbums(query: AdminQuery): Promise<Page<AlbumDto>> {
  const filter: QueryFilter<AlbumDoc> = { ...titleSearch(query.q) };
  if (query.status) filter.status = query.status;
  const [docs, total] = await Promise.all([
    AlbumModel.find(filter)
      .sort({ sortOrder: 1, _id: 1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<AlbumDoc>[]>(),
    AlbumModel.countDocuments(filter),
  ]);
  return {
    items: await toDtos(docs, { publishedOnly: false }),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

export async function getAdminAlbum(id: string): Promise<AlbumDto> {
  const doc = await AlbumModel.findById(id).lean<WithId<AlbumDoc>>();
  if (!doc) throw AppError.notFound('This album no longer exists.');
  const [dto] = await toDtos([doc], { publishedOnly: false });
  if (!dto) throw AppError.notFound();
  return dto;
}

export async function createAlbum(input: AlbumCreate, { media, logger }: MediaDeps) {
  const cover = await resolveImageSlot(
    media,
    'album-cover',
    input.cover,
    undefined,
    logger,
    'cover',
  );
  const slug =
    input.slug ??
    (await generateUniqueSlug(input.title, async (candidate) =>
      Boolean(await AlbumModel.exists({ slug: candidate })),
    ));
  const created = await AlbumModel.create({
    title: input.title,
    slug,
    description: input.description ?? undefined,
    releaseDate: input.releaseDate ? fromIsoDate(input.releaseDate) : undefined,
    cover: cover.value,
    externalLinks: input.externalLinks ?? [],
    status: input.status,
    featured: input.featured,
  });
  return getAdminAlbum(created._id.toHexString());
}

export async function updateAlbum(
  id: string,
  input: AlbumUpdate,
  { media, logger }: MediaDeps,
): Promise<AlbumDto> {
  const doc = await AlbumModel.findById(id);
  if (!doc) throw AppError.notFound('This album no longer exists.');

  if (input.title !== undefined) doc.title = input.title;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.description !== undefined) doc.description = input.description ?? undefined;
  if (input.releaseDate !== undefined) {
    doc.releaseDate = input.releaseDate ? fromIsoDate(input.releaseDate) : undefined;
  }
  if (input.externalLinks !== undefined) doc.externalLinks = input.externalLinks;
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = input.featured;

  const cover = await resolveImageSlot(
    media,
    'album-cover',
    input.cover,
    doc.cover,
    logger,
    'cover',
  );
  doc.cover = cover.value;
  const obsolete: AssetRef[] = cover.obsolete;

  await doc.save();
  await destroyAll(media, obsolete, logger);
  return getAdminAlbum(id);
}

/**
 * Deleting an album that still has tracks fails with 409 ALBUM_NOT_EMPTY, unless the tracks are
 * explicitly detached (plan §8.3). Tracks are never deleted with their album.
 */
export async function deleteAlbum(
  id: string,
  { detachTracks }: { detachTracks: boolean },
  { media, logger }: MediaDeps,
): Promise<void> {
  const albumId = new Types.ObjectId(id);
  if (!(await AlbumModel.exists({ _id: albumId }))) {
    throw AppError.notFound('This album no longer exists.');
  }
  const tracks = await TrackModel.countDocuments({ album: albumId });
  if (tracks > 0 && !detachTracks) {
    throw new AppError(
      409,
      'ALBUM_NOT_EMPTY',
      `This album has ${String(tracks)} track${tracks === 1 ? '' : 's'}. Move or detach them first.`,
    );
  }
  if (tracks > 0) {
    await TrackModel.updateMany({ album: albumId }, { $unset: { album: 1, trackNumber: 1 } });
  }
  const doc = await AlbumModel.findByIdAndDelete(albumId).lean<WithId<AlbumDoc>>();
  if (doc?.cover) await destroyAll(media, [doc.cover.asset], logger);
}

export function reorderAlbums(ids: readonly string[]): Promise<void> {
  return reorder(AlbumModel, ids);
}
