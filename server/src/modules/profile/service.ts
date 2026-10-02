import { AppError } from '../../lib/AppError.js';
import type { WithId } from '../../lib/mongo.js';
import { ProfileModel, type ProfileDoc } from './model.js';

/** The singleton profile. 404 until it has been created (by `seed:content` or the admin). */
export async function getProfileDoc(): Promise<WithId<ProfileDoc>> {
  const profile = await ProfileModel.findOne().lean<WithId<ProfileDoc>>();
  if (!profile) throw AppError.notFound('The profile has not been set up yet.');
  return profile;
}
