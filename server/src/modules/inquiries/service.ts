import { Types, type QueryFilter } from 'mongoose';
import type { z } from 'zod';

import type {
  inquiryAdminListQuerySchema,
  inquiryCreateInputSchema,
  InquiryDto,
  InquiryReceiptDto,
  inquiryUpdateInputSchema,
  PaginationMeta,
} from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import { fromIsoDate } from '../../lib/dates.js';
import type { WithId } from '../../lib/mongo.js';
import { paginationMeta, skipFor } from '../../lib/pagination.js';
import { checkFormToken, hashIp } from './formToken.js';
import { toInquiryDto } from './mapper.js';
import { InquiryModel, type InquiryDoc } from './model.js';

type InquiryCreate = z.output<typeof inquiryCreateInputSchema>;

export interface InquiryContext {
  secret: string;
  ip: string;
  userAgent: string | undefined;
  logger: Logger;
}

const TOKEN_MESSAGES = {
  invalid: 'This form has expired. Reload the page and send your message again.',
  expired: 'This form has expired. Reload the page and send your message again.',
  'too-fast': 'Please take a moment to check your message, then send it again.',
} as const;

/**
 * `POST /api/inquiries` (plan §10.2). A filled honeypot gets the normal answer but nothing is
 * stored, so bots learn nothing. Submissions sooner than a few seconds after the form appeared
 * are refused (people can simply send again).
 */
export async function createInquiry(
  input: InquiryCreate,
  { secret, ip, userAgent, logger }: InquiryContext,
): Promise<InquiryReceiptDto> {
  if (input.website && input.website.trim() !== '') {
    logger.info('Inquiry honeypot triggered; dropped');
    return { id: new Types.ObjectId().toHexString(), receivedAt: new Date().toISOString() };
  }

  const token = checkFormToken(input.formToken, secret);
  if (token !== 'ok') {
    throw AppError.validation(TOKEN_MESSAGES[token], [
      { path: 'formToken', message: TOKEN_MESSAGES[token] },
    ]);
  }

  const created = await InquiryModel.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    inquiryType: input.inquiryType,
    // The event type only means something for bookings.
    eventType: input.inquiryType === 'booking' ? input.eventType : undefined,
    preferredDate: input.preferredDate ? fromIsoDate(input.preferredDate) : undefined,
    eventLocation: input.eventLocation,
    message: input.message,
    meta: { ipHash: hashIp(ip, secret), userAgent: userAgent?.slice(0, 200) },
  });
  // No personal details or message text in logs (plan §15).
  logger.info(
    { inquiryId: created._id.toHexString(), type: input.inquiryType },
    'Inquiry received',
  );
  return { id: created._id.toHexString(), receivedAt: created.createdAt.toISOString() };
}

// --- Admin inbox (plan §13) -------------------------------------------------------------------

type AdminQuery = z.output<typeof inquiryAdminListQuerySchema>;
type InquiryUpdate = z.output<typeof inquiryUpdateInputSchema>;

/** Newest first, optionally one status and/or one type. */
export async function listInquiries(
  query: AdminQuery,
): Promise<{ items: InquiryDto[]; meta: PaginationMeta }> {
  const filter: QueryFilter<InquiryDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.inquiryType) filter.inquiryType = query.inquiryType;
  const [docs, total] = await Promise.all([
    InquiryModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean<WithId<InquiryDoc>[]>(),
    InquiryModel.countDocuments(filter),
  ]);
  return { items: docs.map(toInquiryDto), meta: paginationMeta(query.page, query.limit, total) };
}

export async function getInquiry(id: string): Promise<InquiryDto> {
  const doc = await InquiryModel.findById(id).lean<WithId<InquiryDoc>>();
  if (!doc) throw AppError.notFound('This message no longer exists.');
  return toInquiryDto(doc);
}

export async function updateInquiry(id: string, input: InquiryUpdate): Promise<InquiryDto> {
  const doc = await InquiryModel.findById(id);
  if (!doc) throw AppError.notFound('This message no longer exists.');
  if (input.status !== undefined) doc.status = input.status;
  if (input.adminNotes !== undefined) doc.adminNotes = input.adminNotes ?? undefined;
  await doc.save();
  return getInquiry(id);
}

/** For privacy requests: the message is gone for good (plan §15). */
export async function deleteInquiry(id: string): Promise<void> {
  const doc = await InquiryModel.findByIdAndDelete(id).lean<WithId<InquiryDoc>>();
  if (!doc) throw AppError.notFound('This message no longer exists.');
}
