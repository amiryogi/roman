import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiErrorBodySchema, apiSuccessSchema, eventDtoSchema, homeDtoSchema } from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createEvent, createGalleryImage, createProfile } from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';
import { GalleryImageModel } from '../gallery/model.js';
import { listPublicEvents } from './service.js';

useTestDb();

const eventResponse = apiSuccessSchema(eventDtoSchema);
const eventListResponse = apiSuccessSchema(z.array(eventDtoSchema));

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs);

describe('events', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const post = (body: object) =>
    request(app).post('/api/admin/events').set('Authorization', `Bearer ${token}`).send(body);
  const patch = (id: string, body: object) =>
    request(app)
      .patch(`/api/admin/events/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const venue = { name: 'Hall', city: 'Kathmandu', country: 'Nepal' };

  it('creates an event with a Kathmandu time zone by default', async () => {
    const res = await post({
      title: 'Autumn Recital',
      startsAt: '2026-11-02T19:00:00+05:45',
      endsAt: '2026-11-02T21:00:00+05:45',
      venue,
      ticketUrl: 'https://tickets.example.com/autumn',
    });

    expect(res.status).toBe(201);
    expect(eventResponse.parse(res.body).data).toMatchObject({
      slug: 'autumn-recital',
      startsAt: '2026-11-02T13:15:00.000Z',
      timezone: 'Asia/Kathmandu',
      eventStatus: 'scheduled',
      status: 'draft',
    });
  });

  it('validates dates, links and the venue', async () => {
    const endsFirst = await post({
      title: 'X',
      startsAt: '2026-11-02T19:00:00Z',
      endsAt: '2026-11-02T18:00:00Z',
      venue,
    });
    expect(apiErrorBodySchema.parse(endsFirst.body).error.details?.[0]?.path).toBe('endsAt');

    expect((await post({ title: 'X', startsAt: 'tomorrow', venue })).status).toBe(422);
    expect(
      (await post({ title: 'X', startsAt: '2026-11-02T19:00:00Z', venue: { name: 'Hall' } }))
        .status,
    ).toBe(422);
    expect(
      (
        await post({
          title: 'X',
          startsAt: '2026-11-02T19:00:00Z',
          venue,
          ticketUrl: 'http://insecure.example.com',
        })
      ).status,
    ).toBe(422);
    expect(
      (await post({ title: 'X', startsAt: '2026-11-02T19:00:00Z', venue, timezone: 'Mars/Base' }))
        .status,
    ).toBe(422);
  });

  it('checks the merged dates when only one changes', async () => {
    const event = await createEvent({ startsAt: at(DAY), endsAt: at(DAY + 2 * HOUR) });
    const res = await patch(event._id.toHexString(), {
      startsAt: at(DAY + 3 * HOUR).toISOString(),
    });

    expect(res.status).toBe(422);
    expect(apiErrorBodySchema.parse(res.body).error.details?.[0]?.path).toBe('endsAt');
  });

  it('postpones or cancels, and clears links', async () => {
    const event = await createEvent({ ticketUrl: 'https://tickets.example.com/x' });
    const res = await patch(event._id.toHexString(), { eventStatus: 'cancelled', ticketUrl: '' });

    const updated = eventResponse.parse(res.body).data;
    expect(updated.eventStatus).toBe('cancelled');
    expect(updated.ticketUrl).toBeUndefined();
  });

  it('deletes an event, unlinking its photos and deleting its image', async () => {
    const { publicId } = media.simulateUpload('event');
    const created = eventResponse.parse(
      (
        await post({
          title: 'With image',
          startsAt: at(DAY).toISOString(),
          venue,
          image: { mediaRef: { publicId, resourceType: 'image' }, alt: 'Concert poster' },
        })
      ).body,
    ).data;
    const photo = await createGalleryImage({
      event: new Types.ObjectId(created.id),
    });

    const res = await request(app)
      .delete(`/api/admin/events/${created.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(media.destroyed).toEqual([publicId]);
    expect((await GalleryImageModel.findById(photo._id).orFail()).event).toBeUndefined();
  });

  describe('public', () => {
    it('splits upcoming (soonest first) from past (latest first)', async () => {
      await createEvent({ title: 'Next month', startsAt: at(30 * DAY), status: 'published' });
      await createEvent({ title: 'Next week', startsAt: at(7 * DAY), status: 'published' });
      await createEvent({ title: 'Last year', startsAt: at(-365 * DAY), status: 'published' });
      await createEvent({ title: 'Last week', startsAt: at(-7 * DAY), status: 'published' });
      await createEvent({ title: 'Draft', startsAt: at(DAY), status: 'draft' });

      const upcoming = eventListResponse.parse(
        (await request(app).get('/api/events?when=upcoming')).body,
      );
      expect(upcoming.data.map((e) => e.title)).toEqual(['Next week', 'Next month']);

      const past = await request(app).get('/api/events?when=past');
      expect(past.headers['cache-control']).toMatch(/^public/);
      expect(eventListResponse.parse(past.body).data.map((e) => e.title)).toEqual([
        'Last week',
        'Last year',
      ]);
      expect((await request(app).get('/api/events')).status).toBe(422);
    });

    it('keeps an event upcoming while it is still running', async () => {
      await createEvent({
        title: 'Festival',
        startsAt: at(-DAY),
        endsAt: at(DAY),
        status: 'published',
      });

      const upcoming = eventListResponse.parse(
        (await request(app).get('/api/events?when=upcoming')).body,
      );
      expect(upcoming.data.map((e) => e.title)).toEqual(['Festival']);
      const past = eventListResponse.parse((await request(app).get('/api/events?when=past')).body);
      expect(past.data).toEqual([]);
    });

    it('moves an event to the past by itself once its time has passed', async () => {
      await createEvent({ title: 'Tonight', startsAt: at(2 * HOUR), status: 'published' });
      const query = { page: 1, limit: 10 };

      const before = await listPublicEvents({ ...query, when: 'upcoming' }, new Date());
      expect(before.items.map((e) => e.title)).toEqual(['Tonight']);

      // Three hours later, with nothing changed in the database:
      const later = at(3 * HOUR);
      expect((await listPublicEvents({ ...query, when: 'upcoming' }, later)).items).toEqual([]);
      const past = await listPublicEvents({ ...query, when: 'past' }, later);
      expect(past.items.map((e) => e.title)).toEqual(['Tonight']);
    });

    it('feeds up to three published upcoming events to the home page', async () => {
      await createProfile();
      for (let i = 1; i <= 4; i++) {
        await createEvent({
          title: `Event ${String(i)}`,
          startsAt: at(i * DAY),
          status: 'published',
        });
      }
      await createEvent({ title: 'Old', startsAt: at(-DAY), status: 'published' });

      const home = apiSuccessSchema(homeDtoSchema).parse(
        (await request(app).get('/api/home')).body,
      );
      expect(home.data.upcomingEvents.map((e) => e.title)).toEqual([
        'Event 1',
        'Event 2',
        'Event 3',
      ]);
    });
  });
});
