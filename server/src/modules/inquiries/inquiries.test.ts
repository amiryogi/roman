import request from 'supertest';
import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  apiErrorBodySchema,
  apiSuccessSchema,
  inquiryDtoSchema,
  inquiryFormTokenDtoSchema,
  inquiryReceiptDtoSchema,
} from '@roman/shared';

import { createTestApp, TEST_INQUIRY_SECRET } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createInquiry } from '../../../test/factories.js';
import { checkFormToken, issueFormToken, MAX_AGE_MS, MIN_FILL_MS } from './formToken.js';
import { InquiryModel } from './model.js';

useTestDb();

const receiptResponse = apiSuccessSchema(inquiryReceiptDtoSchema);

/** A token for a form shown `ageMs` ago. */
function tokenAged(ageMs = 10_000): string {
  return issueFormToken(TEST_INQUIRY_SECRET, Date.now() - ageMs);
}

function booking(overrides: object = {}) {
  return {
    name: 'Sita Sharma',
    email: 'Sita@Example.com',
    phone: '+977 9800000000',
    inquiryType: 'booking',
    eventType: 'wedding',
    preferredDate: '2099-03-14',
    eventLocation: 'Pokhara',
    message: 'We would love live violin for our wedding ceremony.',
    website: '',
    formToken: tokenAged(),
    ...overrides,
  };
}

describe('form token', () => {
  it('accepts a form filled in at a human pace, and only for a day', () => {
    const now = Date.now();
    const issued = issueFormToken('secret-value-1234', now);

    expect(checkFormToken(issued, 'secret-value-1234', now + MIN_FILL_MS - 1)).toBe('too-fast');
    expect(checkFormToken(issued, 'secret-value-1234', now + MIN_FILL_MS)).toBe('ok');
    expect(checkFormToken(issued, 'secret-value-1234', now + MAX_AGE_MS + 1)).toBe('expired');
  });

  it('rejects forged or altered tokens', () => {
    const now = Date.now();
    const issued = issueFormToken('secret-value-1234', now - 60_000);
    const [, signature] = issued.split('.');

    expect(checkFormToken(issued, 'another-secret-1234', now)).toBe('invalid');
    expect(
      checkFormToken(`${String(now - 120_000)}.${signature ?? ''}`, 'secret-value-1234', now),
    ).toBe('invalid');
    expect(checkFormToken('garbage', 'secret-value-1234', now)).toBe('invalid');
  });
});

describe('POST /api/inquiries', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  const send = (body: object) => request(app).post('/api/inquiries').send(body);

  it('issues an uncached form token', async () => {
    const res = await request(app).get('/api/inquiries/form-token');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const { token } = apiSuccessSchema(inquiryFormTokenDtoSchema).parse(res.body).data;
    expect(checkFormToken(token, TEST_INQUIRY_SECRET, Date.now() + MIN_FILL_MS)).toBe('ok');
  });

  it('stores a booking with a hashed IP and no raw address', async () => {
    const res = await send(booking());

    expect(res.status).toBe(201);
    const receipt = receiptResponse.parse(res.body).data;
    const stored = await InquiryModel.findById(receipt.id).lean().orFail();
    expect(stored).toMatchObject({
      name: 'Sita Sharma',
      email: 'sita@example.com',
      inquiryType: 'booking',
      eventType: 'wedding',
      status: 'new',
    });
    expect(stored.meta.ipHash).toMatch(/^[a-f\d]{64}$/);
    expect(JSON.stringify(stored)).not.toMatch(/127\.0\.0\.1|::1|::ffff/);
    expect(stored).not.toHaveProperty('website');
    expect(stored).not.toHaveProperty('formToken');
  });

  it('requires an event type for bookings, but not for other enquiries', async () => {
    const noEventType = await send(booking({ eventType: undefined }));
    expect(apiErrorBodySchema.parse(noEventType.body).error.details?.[0]?.path).toBe('eventType');

    const lessons = await send(
      booking({
        inquiryType: 'lessons',
        eventType: 'wedding',
        preferredDate: '',
        eventLocation: '',
      }),
    );
    expect(lessons.status).toBe(201);
    const stored = await InquiryModel.findById(receiptResponse.parse(lessons.body).data.id).lean();
    expect(stored?.eventType).toBeUndefined();
  });

  it('rejects past dates and missing details', async () => {
    expect((await send(booking({ preferredDate: '2000-01-01' }))).status).toBe(422);
    const short = await send(booking({ message: 'Hi' }));
    expect(apiErrorBodySchema.parse(short.body).error.details?.map((d) => d.path)).toContain(
      'message',
    );
  });

  it('silently drops submissions that fill the honeypot', async () => {
    const res = await send(booking({ website: 'https://spam.example' }));

    expect(res.status).toBe(201);
    expect(receiptResponse.parse(res.body).data.id).toMatch(/^[a-f\d]{24}$/);
    expect(await InquiryModel.countDocuments()).toBe(0);
  });

  it('refuses submissions sent too quickly or with a bad token', async () => {
    const tooFast = await send(booking({ formToken: tokenAged(500) }));
    expect(tooFast.status).toBe(422);
    expect(apiErrorBodySchema.parse(tooFast.body).error.details?.[0]?.path).toBe('formToken');

    const forged = await send(booking({ formToken: issueFormToken('wrong-secret-value-123') }));
    expect(forged.status).toBe(422);
    expect((await send(booking({ formToken: undefined }))).status).toBe(422);
    expect(await InquiryModel.countDocuments()).toBe(0);
  });

  it('rejects operator injection', async () => {
    expect((await send(booking({ email: { $gt: '' } }))).status).toBe(422);
  });

  it('accepts five messages an hour from one address', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await send(booking())).status).toBe(201);
    }
    const blocked = await send(booking());

    expect(blocked.status).toBe(429);
    expect(apiErrorBodySchema.parse(blocked.body).error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('does not count rejected messages against the limit', async () => {
    for (let i = 0; i < 6; i++) {
      expect((await send(booking({ message: 'short' }))).status).toBe(422);
    }
    expect((await send(booking())).status).toBe(201);
  });
});

describe('admin inbox', () => {
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    app = createTestApp();
    token = await adminAccessToken(app);
  });

  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const listResponse = apiSuccessSchema(z.array(inquiryDtoSchema));
  const itemResponse = apiSuccessSchema(inquiryDtoSchema);

  it('lists newest first and filters by status and type', async () => {
    await createInquiry({ name: 'Older', createdAt: new Date('2026-09-01T00:00:00Z') });
    await createInquiry({ name: 'Newer', inquiryType: 'lessons', eventType: undefined });
    await createInquiry({ name: 'Done', status: 'archived' });

    const all = listResponse.parse((await auth(request(app).get('/api/admin/inquiries'))).body);
    expect(all.data.map((i) => i.name)).toEqual(['Done', 'Newer', 'Older']);
    expect(all.data[0]).not.toHaveProperty('meta');

    const lessons = listResponse.parse(
      (await auth(request(app).get('/api/admin/inquiries?inquiryType=lessons'))).body,
    );
    expect(lessons.data.map((i) => i.name)).toEqual(['Newer']);
    const archived = listResponse.parse(
      (await auth(request(app).get('/api/admin/inquiries?status=archived'))).body,
    );
    expect(archived.data.map((i) => i.name)).toEqual(['Done']);
  });

  it('marks a message, keeps private notes and clears them', async () => {
    const inquiry = await createInquiry();
    const path = `/api/admin/inquiries/${inquiry._id.toHexString()}`;

    const replied = itemResponse.parse(
      (
        await auth(request(app).patch(path)).send({
          status: 'replied',
          adminNotes: 'Sent a quote.',
        })
      ).body,
    ).data;
    expect(replied).toMatchObject({ status: 'replied', adminNotes: 'Sent a quote.' });

    const cleared = itemResponse.parse(
      (await auth(request(app).patch(path)).send({ adminNotes: '' })).body,
    ).data;
    expect(cleared.adminNotes).toBeUndefined();
    expect((await auth(request(app).patch(path)).send({ status: 'spam' })).status).toBe(422);
  });

  it('deletes a message for good', async () => {
    const inquiry = await createInquiry();
    const path = `/api/admin/inquiries/${inquiry._id.toHexString()}`;

    expect((await auth(request(app).delete(path))).status).toBe(204);
    expect((await auth(request(app).get(path))).status).toBe(404);
    expect(await InquiryModel.countDocuments()).toBe(0);
  });
});
