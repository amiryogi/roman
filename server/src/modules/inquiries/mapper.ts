import type { InquiryDto } from '@roman/shared';

import { optionalIsoDate } from '../../lib/dates.js';
import { toTimestampsDto, type WithId } from '../../lib/mongo.js';
import type { InquiryDoc } from './model.js';

/** Admin-only view. `meta` (IP hash, user agent) stays internal. */
export function toInquiryDto(doc: WithId<InquiryDoc>): InquiryDto {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    inquiryType: doc.inquiryType,
    eventType: doc.eventType,
    preferredDate: optionalIsoDate(doc.preferredDate),
    eventLocation: doc.eventLocation,
    message: doc.message,
    status: doc.status,
    adminNotes: doc.adminNotes,
    ...toTimestampsDto(doc),
  };
}
