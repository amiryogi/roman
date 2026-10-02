import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  galleryImageCreateInputSchema,
  slugify,
  UPLOAD_KIND_RULES,
  type GalleryCategory,
  type UploadKind,
} from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import type { MediaAssetDoc } from '../../lib/mongo.js';
import { generateUniqueSlug } from '../../lib/slug.js';
import { GalleryImageModel } from '../../modules/gallery/model.js';
import { ProfileModel } from '../../modules/profile/model.js';
import { TrackModel } from '../../modules/tracks/model.js';
import { uploadFolder, type MediaService } from '../../services/media/MediaService.js';
import { verifyUpload } from '../../services/media/verify.js';
import { stripJpegMetadata } from './jpeg.js';
import { PROFILE_SEED } from './profileSeed.js';

/** Source files in the repository root (read-only; plan §0.2). */
export const SOURCE_FILES = {
  heroImage: 'images/roman violin.jpg',
  bwPortrait: 'images/roman2.PNG',
  streetPortrait: 'images/roman3.jpg',
  stagePhoto: 'images/roman4.JPG',
  violinStill: 'images/violin.png',
  music: 'music for the website.mp3',
} as const;

type SourceFile = keyof typeof SOURCE_FILES;

/**
 * Gallery drafts. Alt text describes what is visible in each photo, for the owner to review.
 * Everything is a draft, so nothing appears publicly until the owner publishes it.
 * violin.png is licensed for use (owner confirmed 2026-10-02).
 */
const GALLERY_SEED: { file: SourceFile; category: GalleryCategory; alt: string }[] = [
  {
    file: 'heroImage',
    category: 'portrait',
    alt: 'Roman Budhathoki playing an electric violin in a field of tall grass and yellow wildflowers, with the words “Roman Violin” lettered on the photo',
  },
  {
    file: 'bwPortrait',
    category: 'portrait',
    alt: 'Black-and-white photo of Roman Budhathoki in a dark suit, holding a violin under his chin, with the word “Roman” lettered across the photo',
  },
  {
    file: 'streetPortrait',
    category: 'portrait',
    alt: 'Roman Budhathoki sitting against an ivy-covered wall on a quiet street, holding a violin upright beside him',
  },
  {
    file: 'stagePhoto',
    category: 'performance',
    alt: 'Roman Budhathoki performing on stage with an electric violin, in a waistcoat and glasses, in front of warm amber lights',
  },
  {
    file: 'violinStill',
    category: 'behind-the-scenes',
    alt: 'A violin photographed from the front against a black background with a warm amber glow',
  },
];

const HERO_ALT =
  'Roman Budhathoki playing an electric violin in a field of tall grass and yellow wildflowers';
const PORTRAIT_ALT =
  'Roman Budhathoki sitting against an ivy-covered wall, holding a violin upright beside him';

/** The provided MP3 has no title, credits or confirmed rights (plan ASM-8). */
export const PENDING_TRACK_TITLE = 'Untitled (title pending)';

export interface SeedSummary {
  uploaded: number;
  reused: number;
  profile: 'created' | 'kept';
  galleryCreated: number;
  trackCreated: boolean;
}

export interface SeedOptions {
  sourceDir: string;
  media: MediaService;
  logger: Logger;
}

/**
 * Uploads the source media and creates the initial content. Safe to run again: assets get
 * deterministic public IDs (name + content hash) and are reused, and documents are matched by
 * the asset they reference. An existing profile is never overwritten.
 */
export async function seedContent({ sourceDir, media, logger }: SeedOptions): Promise<SeedSummary> {
  const summary: SeedSummary = {
    uploaded: 0,
    reused: 0,
    profile: 'kept',
    galleryCreated: 0,
    trackCreated: false,
  };
  const workDir = await mkdtemp(path.join(tmpdir(), 'roman-seed-'));

  /** Uploads one source file for one kind (once), then verifies it like any admin upload. */
  async function asset(kind: UploadKind, file: SourceFile, label: string): Promise<MediaAssetDoc> {
    const sourcePath = path.join(sourceDir, SOURCE_FILES[file]);
    const original = await readFile(sourcePath);
    const isJpeg = /\.jpe?g$/i.test(sourcePath);
    const bytes = isJpeg ? stripJpegMetadata(original) : original;
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const name = `seed-${slugify(label)}-${hash}`;
    const rule = UPLOAD_KIND_RULES[kind];
    const ref = {
      publicId: `${uploadFolder(media.rootFolder, rule.folder)}/${name}`,
      resourceType: rule.resourceType,
    };

    if (await media.getResource(ref)) {
      summary.reused += 1;
    } else {
      // The temporary copy has a clean name and no Exif; the source file is never modified.
      const uploadPath = path.join(workDir, `${name}${path.extname(sourcePath).toLowerCase()}`);
      await writeFile(uploadPath, bytes);
      const uploaded = await media.uploadFile(kind, uploadPath, name);
      if (uploaded.publicId !== ref.publicId) {
        throw new Error(`Unexpected public ID ${uploaded.publicId} (expected ${ref.publicId})`);
      }
      summary.uploaded += 1;
      logger.info(`Uploaded ${SOURCE_FILES[file]} → ${ref.publicId}`);
    }
    return verifyUpload(media, kind, ref, logger);
  }

  try {
    // Profile: created once from the CV. Separate assets per slot, so replacing one image in the
    // admin panel can never delete an image that another slot still uses.
    if (await ProfileModel.exists({})) {
      logger.info('Profile already exists; left unchanged.');
    } else {
      const heroDesktop = await asset('profile', 'heroImage', 'hero-desktop');
      const heroMobile = await asset('profile', 'heroImage', 'hero-mobile');
      const portrait = await asset('profile', 'streetPortrait', 'portrait');
      await ProfileModel.create({
        ...PROFILE_SEED,
        heroDesktop: { asset: heroDesktop, alt: HERO_ALT },
        heroMobile: { asset: heroMobile, alt: HERO_ALT },
        portrait: { asset: portrait, alt: PORTRAIT_ALT },
      });
      summary.profile = 'created';
      logger.info('Profile created from the CV.');
    }

    for (const item of GALLERY_SEED) {
      const image = await asset('gallery', item.file, `gallery-${item.file}`);
      if (await GalleryImageModel.exists({ 'image.publicId': image.publicId })) continue;
      // Same validation as the admin form, so seeded content can't break later edits.
      const input = galleryImageCreateInputSchema.parse({
        image: { publicId: image.publicId, resourceType: image.resourceType },
        alt: item.alt,
        category: item.category,
      });
      await GalleryImageModel.create({
        image,
        alt: input.alt,
        category: input.category,
        status: 'draft',
      });
      summary.galleryCreated += 1;
    }

    const audio = await asset('track-audio', 'music', 'music-for-the-website');
    if (!(await TrackModel.exists({ 'audio.publicId': audio.publicId }))) {
      const slug = await generateUniqueSlug(PENDING_TRACK_TITLE, async (candidate) =>
        Boolean(await TrackModel.exists({ slug: candidate })),
      );
      await TrackModel.create({ title: PENDING_TRACK_TITLE, slug, audio, status: 'draft' });
      summary.trackCreated = true;
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  return summary;
}
