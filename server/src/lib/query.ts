import mongoose, { type Model } from 'mongoose';

import { OBJECT_ID_PATTERN } from '@roman/shared';

import { AppError } from './AppError.js';

/** Case-insensitive "contains" filter for admin title search. The input is regex-escaped. */
export function titleSearch(q: string | undefined): Record<string, unknown> {
  if (!q) return {};
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { title: mongoose.trusted({ $regex: escaped, $options: 'i' }) };
}

/** `:id` route parameter. An invalid id is a 404, never a 500 (plan §10.1). */
export function idParam(params: Record<string, string | undefined>): string {
  const id = params.id ?? '';
  if (!OBJECT_ID_PATTERN.test(id)) throw AppError.notFound();
  return id;
}

/**
 * `PATCH /api/admin/<resource>/order` (plan §10.4). The listed items swap their existing sortOrder
 * values into the new order, so moving items on one admin page never disturbs items on others.
 * Every id must exist.
 */
export async function reorder<T extends { sortOrder: number }>(
  model: Model<T>,
  ids: readonly string[],
): Promise<void> {
  if (new Set(ids).size !== ids.length) {
    throw AppError.validation('Each item may appear only once.', [
      { path: 'ids', message: 'Duplicate id' },
    ]);
  }
  const docs = await model
    .find({ _id: mongoose.trusted({ $in: ids }) })
    .select('sortOrder')
    .lean<{ _id: mongoose.Types.ObjectId; sortOrder: number }[]>();
  if (docs.length !== ids.length) {
    throw AppError.validation('Some items no longer exist. Reload and try again.', [
      { path: 'ids', message: 'Unknown id' },
    ]);
  }
  const slots = docs.map((doc) => doc.sortOrder).sort((a, b) => a - b);
  // Through the driver collection: only sortOrder changes, and the generic model type can't
  // express this update without `any`.
  await model.collection.bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { sortOrder: slots[index] ?? index } },
      },
    })),
  );
}
