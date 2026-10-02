import { model, Schema } from 'mongoose';

import {
  DEFAULT_TIME_ZONE,
  EVENT_STATUSES,
  PUBLICATION_STATUSES,
  type EventStatus,
  type PublicationStatus,
} from '@roman/shared';

import { imageSchema, type ImageDoc, type Timestamps } from '../../lib/mongo.js';

export interface EventDoc extends Timestamps {
  title: string;
  slug: string;
  description?: string;
  /** Stored in UTC. "Upcoming" vs "past" is computed from this, never stored. */
  startsAt: Date;
  endsAt?: Date;
  /** IANA zone used for display. */
  timezone: string;
  venue: { name: string; address?: string; city: string; country: string };
  eventStatus: EventStatus;
  ticketUrl?: string;
  infoUrl?: string;
  image?: ImageDoc;
  status: PublicationStatus;
  featured: boolean;
}

const eventSchema = new Schema<EventDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    description: { type: String, maxlength: 3000 },
    startsAt: { type: Date, required: true },
    endsAt: Date,
    timezone: { type: String, required: true, default: DEFAULT_TIME_ZONE },
    venue: {
      type: new Schema(
        {
          name: { type: String, required: true, maxlength: 150 },
          address: { type: String, maxlength: 200 },
          city: { type: String, required: true, maxlength: 100 },
          country: { type: String, required: true, maxlength: 100 },
        },
        { _id: false },
      ),
      required: true,
    },
    eventStatus: { type: String, enum: [...EVENT_STATUSES], default: 'scheduled', required: true },
    ticketUrl: { type: String, maxlength: 2048 },
    infoUrl: { type: String, maxlength: 2048 },
    image: imageSchema,
    status: { type: String, enum: [...PUBLICATION_STATUSES], default: 'draft', required: true },
    featured: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, startsAt: 1 });

export const EventModel = model<EventDoc>('Event', eventSchema);
