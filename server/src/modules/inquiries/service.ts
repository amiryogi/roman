import { Types } from 'mongoose';
import type { z } from 'zod';

import type { inquiryCreateInputSchema, InquiryReceiptDto } from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import { fromIsoDate } from '../../lib/dates.js';
import { checkFormToken, hashIp } from './formToken.js';
import { InquiryModel } from './model.js';

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
