import type { QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  PaginationMeta,
  sheetMusicAdminListQuerySchema,
  sheetMusicCreateInputSchema,
  SheetMusicDto,
  sheetMusicPublicQuerySchema,
  sheetMusicUpdateInputSchema,
} from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import type { WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { reorder, titleSearch } from '../../lib/query.js';
import { generateUniqueSlug } from '../../lib/slug.js';
import { destroyAll, resolveImageSlot } from '../../services/media/slots.js';
import type { MediaDeps } from '../tracks/service.js';
import { toSheetMusicDto } from './mapper.js';
import { SheetMusicModel, type SheetMusicDoc } from './model.js';

type SheetMusicCreate = z.output<typeof sheetMusicCreateInputSchema>;
type SheetMusicUpdate = z.output<typeof sheetMusicUpdateInputSchema>;
type PublicQuery = z.output<typeof sheetMusicPublicQuerySchema>;
type AdminQuery = z.output<typeof sheetMusicAdminListQuerySchema>;

interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

async function page(
  filter: QueryFilter<SheetMusicDoc>,
  query: { page: number; limit: number },
): Promise<Page<SheetMusicDto>> {
  const [docs, total] = await Promise.all([
    SheetMusicModel.find(filter)
      .sort({ sortOrder: 1, _id: 1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<SheetMusicDoc>[]>(),
    SheetMusicModel.countDocuments(filter),
  ]);
  return {
    items: docs.map(toSheetMusicDto),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

// --- Public ---------------------------------------------------------------------------------

/** `GET /api/sheet-music`: published scores in manual order. */
export function listPublicSheetMusic(query: PublicQuery): Promise<Page<SheetMusicDto>> {
  return page({ status: 'published' }, query);
}

/** For the home page, which shows its sheet-music teaser only when there is something to see. */
export function countPublishedSheetMusic(): Promise<number> {
  return SheetMusicModel.countDocuments({ status: 'published' });
}

// --- Admin ----------------------------------------------------------------------------------

export function listAdminSheetMusic(query: AdminQuery): Promise<Page<SheetMusicDto>> {
  const filter: QueryFilter<SheetMusicDoc> = { ...titleSearch(query.q) };
  if (query.status) filter.status = query.status;
  return page(filter, query);
}

export async function getAdminSheetMusic(id: string): Promise<SheetMusicDto> {
  const doc = await SheetMusicModel.findById(id).lean<WithId<SheetMusicDoc>>();
  if (!doc) throw AppError.notFound('This score no longer exists.');
  return toSheetMusicDto(doc);
}

export async function createSheetMusic(
  input: SheetMusicCreate,
  { media, logger }: MediaDeps,
): Promise<SheetMusicDto> {
  const preview = await resolveImageSlot(
    media,
    'sheet-music',
    input.preview,
    undefined,
    logger,
    'preview',
  );
  const slug =
    input.slug ??
    (await generateUniqueSlug(input.title, async (candidate) =>
      Boolean(await SheetMusicModel.exists({ slug: candidate })),
    ));
  const created = await SheetMusicModel.create({
    title: input.title,
    slug,
    artist: input.artist ?? undefined,
    description: input.description ?? undefined,
    level: input.level ?? undefined,
    preview: preview.value,
    externalUrl: input.externalUrl ?? undefined,
    status: input.status,
    featured: input.featured,
  });
  return getAdminSheetMusic(created._id.toHexString());
}

export async function updateSheetMusic(
  id: string,
  input: SheetMusicUpdate,
  { media, logger }: MediaDeps,
): Promise<SheetMusicDto> {
  const doc = await SheetMusicModel.findById(id);
  if (!doc) throw AppError.notFound('This score no longer exists.');

  if (input.title !== undefined) doc.title = input.title;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.artist !== undefined) doc.artist = input.artist ?? undefined;
  if (input.description !== undefined) doc.description = input.description ?? undefined;
  if (input.level !== undefined) doc.level = input.level ?? undefined;
  if (input.externalUrl !== undefined) doc.externalUrl = input.externalUrl ?? undefined;
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = input.featured;

  const preview = await resolveImageSlot(
    media,
    'sheet-music',
    input.preview,
    doc.preview,
    logger,
    'preview',
  );
  doc.preview = preview.value;

  await doc.save();
  await destroyAll(media, preview.obsolete, logger);
  return getAdminSheetMusic(id);
}

export async function deleteSheetMusic(id: string, { media, logger }: MediaDeps): Promise<void> {
  const doc = await SheetMusicModel.findByIdAndDelete(id).lean<WithId<SheetMusicDoc>>();
  if (!doc) throw AppError.notFound('This score no longer exists.');
  if (doc.preview) await destroyAll(media, [doc.preview.asset], logger);
}

export function reorderSheetMusic(ids: readonly string[]): Promise<void> {
  return reorder(SheetMusicModel, ids);
}
