import type { ProfileAdminDto, ProfileInputParsed } from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import type { WithId } from '../../lib/mongo.js';
import type { AssetRef } from '../../services/media/MediaService.js';
import { destroyAll, resolveImageSlot } from '../../services/media/slots.js';
import type { MediaDeps } from '../tracks/service.js';
import { toProfileAdminDto } from './mapper.js';
import { PROFILE_KEY, ProfileModel, type ProfileDoc } from './model.js';

/** The singleton profile. 404 until it has been created (by `seed:content` or the admin). */
export async function getProfileDoc(): Promise<WithId<ProfileDoc>> {
  const profile = await ProfileModel.findOne().lean<WithId<ProfileDoc>>();
  if (!profile) throw AppError.notFound('The profile has not been set up yet.');
  return profile;
}

const IMAGE_SLOTS = ['portrait', 'heroDesktop', 'heroMobile', 'ogImage'] as const;

/**
 * `PUT /api/admin/profile` (plan §10.4): replaces the whole profile, creating it if needed.
 * As with any full replacement, an image slot that isn't sent is removed; `{ alt }` alone keeps
 * the current image. Replaced images are deleted after the save succeeds.
 */
export async function replaceProfile(
  input: ProfileInputParsed,
  { media, logger }: MediaDeps,
): Promise<ProfileAdminDto> {
  const doc = (await ProfileModel.findOne()) ?? new ProfileModel({ key: PROFILE_KEY });
  const obsolete: AssetRef[] = [];

  for (const slot of IMAGE_SLOTS) {
    const change = await resolveImageSlot(
      media,
      'profile',
      input[slot] ?? null,
      doc[slot],
      logger,
      slot,
    );
    doc[slot] = change.value;
    obsolete.push(...change.obsolete);
  }

  doc.displayName = input.displayName;
  doc.tagline = input.tagline;
  doc.shortBio = input.shortBio;
  doc.biography = input.biography;
  doc.education = input.education;
  doc.experience = input.experience;
  doc.achievements = input.achievements;
  doc.philosophy = input.philosophy;
  doc.skills = input.skills;
  doc.affiliations = input.affiliations;
  doc.contact = input.contact;
  doc.socials = input.socials;
  doc.seo = input.seo;

  await doc.save();
  await destroyAll(media, obsolete, logger);
  return toProfileAdminDto(await getProfileDoc());
}
