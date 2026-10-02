import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
  createEvent,
  createGalleryImage,
  createInquiry,
  createTrack,
  createVideo,
} from '../test/factories.js';
import { useTestDb } from '../test/db.js';
import { EventModel } from './modules/events/model.js';
import { GalleryImageModel } from './modules/gallery/model.js';
import { InquiryModel } from './modules/inquiries/model.js';
import { TrackModel } from './modules/tracks/model.js';
import { VideoModel } from './modules/videos/model.js';

useTestDb();

/** All stage names in an explain() plan, e.g. ["FETCH", "IXSCAN"]. */
function stagesOf(plan: unknown): string[] {
  if (Array.isArray(plan)) return plan.flatMap(stagesOf);
  if (typeof plan !== 'object' || plan === null) return [];
  return Object.entries(plan).flatMap(([key, value]) =>
    key === 'stage' && typeof value === 'string' ? [value] : stagesOf(value),
  );
}

async function winningStages(query: { explain(verbosity: string): Promise<unknown> }) {
  const explained = await query.explain('queryPlanner');
  const planner =
    typeof explained === 'object' && explained !== null && 'queryPlanner' in explained
      ? explained.queryPlanner
      : explained;
  const winning =
    typeof planner === 'object' && planner !== null && 'winningPlan' in planner
      ? planner.winningPlan
      : planner;
  return stagesOf(winning);
}

describe('public list queries use indexes (no collection scans)', () => {
  it.each([
    [
      'tracks, featured first',
      () => TrackModel.find({ status: 'published' }).sort({ featured: -1, sortOrder: 1 }),
    ],
    [
      'featured tracks',
      () => TrackModel.find({ status: 'published', featured: true }).sort({ sortOrder: 1 }),
    ],
    [
      'videos by category',
      () =>
        VideoModel.find({ status: 'published', category: 'performance' }).sort({ sortOrder: 1 }),
    ],
    ['gallery, all', () => GalleryImageModel.find({ status: 'published' }).sort({ sortOrder: 1 })],
    [
      'gallery by category',
      () =>
        GalleryImageModel.find({ status: 'published', category: 'portrait' }).sort({
          sortOrder: 1,
        }),
    ],
    [
      'upcoming events',
      () =>
        EventModel.find({
          status: 'published',
          startsAt: mongoose.trusted({ $gte: new Date() }),
        }).sort({ startsAt: 1 }),
    ],
    ['inquiry inbox', () => InquiryModel.find({ status: 'new' }).sort({ createdAt: -1 })],
    ['slug lookup', () => TrackModel.findOne({ slug: 'track-1' })],
  ])('%s', async (_name, buildQuery) => {
    await Promise.all([
      createTrack({ status: 'published' }),
      createTrack(),
      createVideo({ status: 'published' }),
      createGalleryImage({ status: 'published' }),
      createEvent({ status: 'published' }),
      createInquiry(),
    ]);

    const stages = await winningStages(buildQuery());

    expect(stages.some((stage) => stage.endsWith('IXSCAN'))).toBe(true);
    expect(stages).not.toContain('COLLSCAN');
  });
});

describe('query sanitisation', () => {
  it('neutralises injected operators in filters', async () => {
    await createTrack({ slug: 'real-track', status: 'published' });

    // e.g. GET /?slug[$ne]=x reaching a query unvalidated. Mongoose's filter types already block
    // this at compile time, so the runtime guard is exercised through the untyped builder.
    const injected: unknown = JSON.parse('{"$ne":"nothing"}');
    // sanitizeFilter wraps it as { $eq: { $ne: ... } }, which can't be cast to a string: the
    // query fails (mapped to 422) instead of matching every document.
    await expect(TrackModel.find().where('slug').equals(injected)).rejects.toThrow(
      mongoose.Error.CastError,
    );
  });

  it('allows operators the code explicitly trusts', async () => {
    await createTrack({ slug: 'real-track' });

    const found = await TrackModel.find({ slug: mongoose.trusted({ $ne: 'nothing' }) });

    expect(found).toHaveLength(1);
  });
});
