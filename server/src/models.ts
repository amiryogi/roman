import { AlbumModel } from './modules/albums/model.js';
import { AdminModel } from './modules/auth/admin.model.js';
import { SessionModel } from './modules/auth/session.model.js';
import { EventModel } from './modules/events/model.js';
import { GalleryImageModel } from './modules/gallery/model.js';
import { InquiryModel } from './modules/inquiries/model.js';
import { ProfileModel } from './modules/profile/model.js';
import { TrackModel } from './modules/tracks/model.js';
import { VideoModel } from './modules/videos/model.js';

/** Every registered model, for index syncing and test setup. */
export const ALL_MODELS = [
  AdminModel,
  SessionModel,
  ProfileModel,
  AlbumModel,
  TrackModel,
  VideoModel,
  GalleryImageModel,
  EventModel,
  InquiryModel,
] as const;

/** Creates missing indexes and drops ones no longer declared. Run on deploy (autoIndex is off in production). */
export async function syncAllIndexes(): Promise<void> {
  for (const model of ALL_MODELS) {
    await model.syncIndexes();
  }
}
