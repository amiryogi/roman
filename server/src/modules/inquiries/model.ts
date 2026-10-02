import { model, Schema } from 'mongoose';

import {
  BOOKING_EVENT_TYPES,
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  type BookingEventType,
  type InquiryStatus,
  type InquiryType,
} from '@roman/shared';

import type { Timestamps } from '../../lib/mongo.js';

export interface InquiryDoc extends Timestamps {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  eventType?: BookingEventType;
  preferredDate?: Date;
  eventLocation?: string;
  message: string;
  status: InquiryStatus;
  adminNotes?: string;
  /** Salted SHA-256 of the client IP: rate-limit forensics without storing the address. */
  meta: { ipHash: string; userAgent?: string };
}

const inquirySchema = new Schema<InquiryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, maxlength: 254 },
    phone: { type: String, maxlength: 30 },
    inquiryType: { type: String, enum: [...INQUIRY_TYPES], required: true },
    eventType: { type: String, enum: [...BOOKING_EVENT_TYPES] },
    preferredDate: Date,
    eventLocation: { type: String, maxlength: 200 },
    message: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: [...INQUIRY_STATUSES], default: 'new', required: true },
    adminNotes: { type: String, maxlength: 5000 },
    meta: {
      type: new Schema(
        { ipHash: { type: String, required: true }, userAgent: { type: String, maxlength: 200 } },
        { _id: false },
      ),
      required: true,
    },
  },
  { timestamps: true },
);

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ createdAt: -1 });

export const InquiryModel = model<InquiryDoc>('Inquiry', inquirySchema);
