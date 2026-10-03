import mongoose, { Types, type QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  PaginationMeta,
  TrackDto,
  trackAdminListQuerySchema,
  trackCreateInputSchema,
  tracksPublicQuerySchema,
  trackUpdateInputSchema,
} from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import { toImageDto, type WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { reorder, titleSearch } from '../../lib/query.js';
import { generateUniqueSlug } from '../../lib/slug.js';
import type { AssetRef, MediaService } from '../../services/media/MediaService.js';
import { destroyAll, resolveImageSlot, resolveMediaRef } from '../../services/media/slots.js';
import { AlbumModel, type AlbumDoc } from '../albums/model.js';
import { toTrackDto, type TrackAlbumRef } from './mapper.js';
import { TrackModel, type TrackDoc } from './model.js';

type TrackCreate = z.output<typeof trackCreateInputSchema>;
type TrackUpdate = z.output<typeof trackUpdateInputSchema>;
type PublicQuery = z.output<typeof tracksPublicQuerySchema>;
type AdminQuery = z.output<typeof trackAdminListQuerySchema>;

export interface MediaDeps {
  media: MediaService;
  logger: Logger;
}

interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Album references for a list of tracks. Public responses only name published albums, so a draft
 * album's title never leaks through its tracks.
 */
async function withAlbums(
  docs: WithId<TrackDoc>[],
  { publishedOnly }: { publishedOnly: boolean },
): Promise<TrackDto[]> {
  const ids = [...new Set(docs.flatMap((doc) => (doc.album ? [doc.album.toHexString()] : [])))];
  const albums =
    ids.length === 0
      ? []
      : await AlbumModel.find({
          _id: mongoose.trusted({ $in: ids }),
          ...(publishedOnly ? { status: 'published' } : {}),
        }).lean<WithId<AlbumDoc>[]>();
  const refs = new Map<string, TrackAlbumRef>(
    albums.map((album) => [
      album._id.toHexString(),
      {
        id: album._id.toHexString(),
        title: album.title,
        slug: album.slug,
        cover: toImageDto(album.cover),
      },
    ]),
  );
  return docs.map((doc) =>
    toTrackDto(doc, doc.album ? refs.get(doc.album.toHexString()) : undefined),
  );
}

async function findLean(id: string): Promise<WithId<TrackDoc>> {
  const doc = await TrackModel.findById(id).lean<WithId<TrackDoc>>();
  if (!doc) throw AppError.notFound('This track no longer exists.');
  return doc;
}

async function assertAlbumExists(albumId: string): Promise<void> {
  if (!(await AlbumModel.exists({ _id: albumId }))) {
    throw AppError.validation('The selected album no longer exists.', [
      { path: 'albumId', message: 'Choose an existing album' },
    ]);
  }
}

// --- Public ---------------------------------------------------------------------------------

/** `GET /api/tracks`: published tracks, featured first (plan §10.2). */
export async function listPublicTracks(query: PublicQuery): Promise<Page<TrackDto>> {
  const filter: QueryFilter<TrackDoc> = { status: 'published' };
  if (query.featured !== undefined) filter.featured = query.featured;

  let sort: Record<string, 1 | -1> = { featured: -1, sortOrder: 1 };
  if (query.album) {
    const album = await AlbumModel.findOne({ slug: query.album, status: 'published' }).lean<
      WithId<AlbumDoc>
    >();
    if (!album) return { items: [], meta: paginationMeta(query.page, query.limit, 0) };
    filter.album = album._id;
    sort = { trackNumber: 1, sortOrder: 1 };
  }

  const [docs, total] = await Promise.all([
    TrackModel.find(filter)
      .sort(sort)
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<TrackDoc>[]>(),
    TrackModel.countDocuments(filter),
  ]);
  return {
    items: await withAlbums(docs, { publishedOnly: true }),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

/** Featured, published tracks for the home page. */
export async function listFeaturedTracks(limit: number): Promise<TrackDto[]> {
  const docs = await TrackModel.find({ status: 'published', featured: true })
    .sort({ sortOrder: 1 })
    .limit(limit)
    .lean<WithId<TrackDoc>[]>();
  return withAlbums(docs, { publishedOnly: true });
}

/** Published tracks of one album, in track order (for the album page). */
export async function listPublishedAlbumTracks(albumId: Types.ObjectId): Promise<TrackDto[]> {
  const docs = await TrackModel.find({ status: 'published', album: albumId })
    .sort({ trackNumber: 1, sortOrder: 1 })
    .lean<WithId<TrackDoc>[]>();
  return withAlbums(docs, { publishedOnly: true });
}

// --- Admin ----------------------------------------------------------------------------------

export async function listAdminTracks(query: AdminQuery): Promise<Page<TrackDto>> {
  const filter: QueryFilter<TrackDoc> = { ...titleSearch(query.q) };
  if (query.status) filter.status = query.status;
  if (query.albumId) filter.album = new Types.ObjectId(query.albumId);

  const [docs, total] = await Promise.all([
    TrackModel.find(filter)
      .sort({ sortOrder: 1, _id: 1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<TrackDoc>[]>(),
    TrackModel.countDocuments(filter),
  ]);
  return {
    items: await withAlbums(docs, { publishedOnly: false }),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

export async function getAdminTrack(id: string): Promise<TrackDto> {
  const [dto] = await withAlbums([await findLean(id)], { publishedOnly: false });
  if (!dto) throw AppError.notFound();
  return dto;
}

export async function createTrack(input: TrackCreate, { media, logger }: MediaDeps) {
  if (input.albumId) await assertAlbumExists(input.albumId);
  const audio = await resolveMediaRef(media, 'track-audio', input.audio, undefined, logger);
  const cover = await resolveImageSlot(
    media,
    'track-cover',
    input.cover,
    undefined,
    logger,
    'cover',
  );
  const slug =
    input.slug ??
    (await generateUniqueSlug(input.title, async (candidate) =>
      Boolean(await TrackModel.exists({ slug: candidate })),
    ));

  const created = await TrackModel.create({
    title: input.title,
    slug,
    album: input.albumId ?? undefined,
    trackNumber: input.trackNumber ?? undefined,
    artistCredit: input.artistCredit,
    credits: input.credits ?? undefined,
    description: input.description ?? undefined,
    audio: audio.value,
    cover: cover.value,
    year: input.year ?? undefined,
    tags: input.tags ?? [],
    status: input.status,
    featured: input.featured,
  });
  return getAdminTrack(created._id.toHexString());
}

export async function updateTrack(
  id: string,
  input: TrackUpdate,
  { media, logger }: MediaDeps,
): Promise<TrackDto> {
  const doc = await TrackModel.findById(id);
  if (!doc) throw AppError.notFound('This track no longer exists.');
  const obsolete: AssetRef[] = [];

  if (input.title !== undefined) doc.title = input.title;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.albumId !== undefined) {
    if (input.albumId === null) {
      doc.album = undefined;
    } else {
      await assertAlbumExists(input.albumId);
      doc.album = new Types.ObjectId(input.albumId);
    }
  }
  if (input.trackNumber !== undefined) doc.trackNumber = input.trackNumber ?? undefined;
  if (input.artistCredit !== undefined) doc.artistCredit = input.artistCredit;
  if (input.credits !== undefined) doc.credits = input.credits ?? undefined;
  if (input.description !== undefined) doc.description = input.description ?? undefined;
  if (input.year !== undefined) doc.year = input.year ?? undefined;
  if (input.tags !== undefined) doc.tags = input.tags;
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = input.featured;

  if (input.audio !== undefined) {
    const audio = await resolveMediaRef(media, 'track-audio', input.audio, doc.audio, logger);
    doc.audio = audio.value;
    obsolete.push(...audio.obsolete);
  }
  const cover = await resolveImageSlot(
    media,
    'track-cover',
    input.cover,
    doc.cover,
    logger,
    'cover',
  );
  doc.cover = cover.value;
  obsolete.push(...cover.obsolete);

  await doc.save();
  await destroyAll(media, obsolete, logger);
  return getAdminTrack(id);
}

export async function deleteTrack(id: string, { media, logger }: MediaDeps): Promise<void> {
  const doc = await TrackModel.findByIdAndDelete(id).lean<WithId<TrackDoc>>();
  if (!doc) throw AppError.notFound('This track no longer exists.');
  await destroyAll(media, [doc.audio, ...(doc.cover ? [doc.cover.asset] : [])], logger);
}

export function reorderTracks(ids: readonly string[]): Promise<void> {
  return reorder(TrackModel, ids);
}
