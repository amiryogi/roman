import { describe, expect, it } from 'vitest';

import {
  adminDtoSchema,
  albumDtoSchema,
  eventDtoSchema,
  galleryImageDtoSchema,
  inquiryDtoSchema,
  profileAdminDtoSchema,
  profileDtoSchema,
  profileSummaryDtoSchema,
  trackDtoSchema,
  videoDtoSchema,
} from '@roman/shared';

import {
  audioAsset,
  createAdmin,
  createAlbum,
  createEvent,
  createGalleryImage,
  createInquiry,
  createProfile,
  createTrack,
  createVideo,
  objectId,
} from '../test/factories.js';
import { useTestDb } from '../test/db.js';
import type { WithId } from './lib/mongo.js';
import { toAlbumDto } from './modules/albums/mapper.js';
import { AlbumModel, type AlbumDoc } from './modules/albums/model.js';
import { AdminModel, type AdminDoc } from './modules/auth/admin.model.js';
import { toAdminDto } from './modules/auth/mapper.js';
import { toEventDto } from './modules/events/mapper.js';
import { EventModel, type EventDoc } from './modules/events/model.js';
import { toGalleryImageDto } from './modules/gallery/mapper.js';
import { GalleryImageModel, type GalleryImageDoc } from './modules/gallery/model.js';
import { toInquiryDto } from './modules/inquiries/mapper.js';
import { InquiryModel, type InquiryDoc } from './modules/inquiries/model.js';
import { toProfileAdminDto, toProfileDto, toProfileSummaryDto } from './modules/profile/mapper.js';
import { ProfileModel, type ProfileDoc } from './modules/profile/model.js';
import { toTrackDto } from './modules/tracks/mapper.js';
import { TrackModel, type TrackDoc } from './modules/tracks/model.js';
import { toVideoDto } from './modules/videos/mapper.js';
import { VideoModel, type VideoDoc } from './modules/videos/model.js';

useTestDb();

// Each mapper's output must satisfy the shared (strict) DTO schema, so no internal field can leak.

describe('mappers produce valid DTOs', () => {
  it('admin: never exposes the password hash', async () => {
    const created = await createAdmin();
    const doc = await AdminModel.findById(created._id).lean<WithId<AdminDoc>>().orFail();
    const dto = toAdminDto(doc);

    expect(adminDtoSchema.parse(dto)).toEqual(dto);
    expect(JSON.stringify(dto)).not.toContain('argon2');
  });

  it('profile: hides the phone publicly unless showPhone is set', async () => {
    const created = await createProfile();
    const doc = await ProfileModel.findById(created._id).lean<WithId<ProfileDoc>>().orFail();

    const publicDto = profileDtoSchema.parse(toProfileDto(doc));
    expect(publicDto.contact.phone).toBeUndefined();
    expect(profileAdminDtoSchema.parse(toProfileAdminDto(doc)).contact.phone).toBe(
      '+977 9800000000',
    );
    expect(profileSummaryDtoSchema.parse(toProfileSummaryDto(doc)).portrait?.alt).toBeDefined();

    const shown = toProfileDto({ ...doc, contact: { ...doc.contact, showPhone: true } });
    expect(shown.contact.phone).toBe('+977 9800000000');
  });

  it('album', async () => {
    const created = await createAlbum({ releaseDate: new Date('2024-05-01T00:00:00Z') });
    const doc = await AlbumModel.findById(created._id).lean<WithId<AlbumDoc>>().orFail();
    const dto = albumDtoSchema.parse(toAlbumDto(doc, 3));

    expect(dto).toMatchObject({ releaseDate: '2024-05-01', trackCount: 3, status: 'draft' });
  });

  it('track: duration comes from the audio asset', async () => {
    const created = await createTrack({ audio: audioAsset({ duration: 123.4 }) });
    const doc = await TrackModel.findById(created._id).lean<WithId<TrackDoc>>().orFail();
    const dto = trackDtoSchema.parse(
      toTrackDto(doc, { id: objectId().toHexString(), title: 'Album', slug: 'album' }),
    );

    expect(dto.duration).toBe(123.4);
    expect(dto.artistCredit).toBe('Roman Budhathoki');
  });

  it('video: maps both sources', async () => {
    const youtube = await createVideo();
    const cloudinary = await createVideo({
      source: 'cloudinary',
      youtubeId: undefined,
      media: audioAsset({ format: 'mp4', width: 1920, height: 1080 }),
    });

    for (const created of [youtube, cloudinary]) {
      const doc = await VideoModel.findById(created._id).lean<WithId<VideoDoc>>().orFail();
      expect(videoDtoSchema.parse(toVideoDto(doc)).source).toBe(created.source);
    }
  });

  it('video: the schema rejects a source without its media', async () => {
    await expect(createVideo({ youtubeId: undefined })).rejects.toThrow(/YouTube videos need/);
    await expect(createVideo({ source: 'cloudinary' })).rejects.toThrow(/Cloudinary videos/);
  });

  it('gallery image', async () => {
    const created = await createGalleryImage({ event: objectId() });
    const doc = await GalleryImageModel.findById(created._id)
      .lean<WithId<GalleryImageDoc>>()
      .orFail();

    expect(galleryImageDtoSchema.parse(toGalleryImageDto(doc)).eventId).toMatch(/^[a-f\d]{24}$/);
  });

  it('event: defaults to Asia/Kathmandu and scheduled', async () => {
    const created = await createEvent();
    const doc = await EventModel.findById(created._id).lean<WithId<EventDoc>>().orFail();

    expect(eventDtoSchema.parse(toEventDto(doc))).toMatchObject({
      timezone: 'Asia/Kathmandu',
      eventStatus: 'scheduled',
    });
  });

  it('inquiry: keeps the IP hash internal', async () => {
    const created = await createInquiry();
    const doc = await InquiryModel.findById(created._id).lean<WithId<InquiryDoc>>().orFail();
    const dto = inquiryDtoSchema.parse(toInquiryDto(doc));

    expect(dto.status).toBe('new');
    expect(JSON.stringify(dto)).not.toContain('ipHash');
  });
});
