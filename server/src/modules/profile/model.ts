import { model, Schema } from 'mongoose';

import {
  EXPERIENCE_CATEGORIES,
  SOCIAL_PLATFORMS,
  type ExperienceCategory,
  type SocialPlatform,
} from '@roman/shared';

import { imageSchema, type ImageDoc, type Timestamps } from '../../lib/mongo.js';

export const PROFILE_KEY = 'main';

export interface ProfileDoc extends Timestamps {
  /** Singleton key; there is exactly one profile document. */
  key: typeof PROFILE_KEY;
  displayName: string;
  tagline: string;
  shortBio: string;
  biography: { heading?: string; body: string }[];
  education: { year: string; title: string; institution?: string; location?: string }[];
  experience: {
    period: string;
    role: string;
    organization: string;
    location?: string;
    category: ExperienceCategory;
    highlights: string[];
  }[];
  achievements: { year?: string; title: string; description?: string }[];
  philosophy?: string;
  skills: string[];
  affiliations: { name: string; since?: string }[];
  contact: { publicEmail?: string; phone?: string; showPhone: boolean; location?: string };
  socials: { platform: SocialPlatform; url: string; label?: string }[];
  portrait?: ImageDoc;
  heroDesktop?: ImageDoc;
  heroMobile?: ImageDoc;
  ogImage?: ImageDoc;
  /** Absent when empty: Mongoose drops empty subdocuments on save. */
  seo?: { metaTitle?: string; metaDescription?: string };
}

// Field limits mirror the shared Zod schemas, which validate input before it gets here.
const opts = { _id: false };

const profileSchema = new Schema<ProfileDoc>(
  {
    key: { type: String, enum: [PROFILE_KEY], default: PROFILE_KEY, required: true, unique: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    tagline: { type: String, required: true, trim: true, maxlength: 120 },
    shortBio: { type: String, required: true, trim: true, maxlength: 600 },
    biography: [new Schema({ heading: String, body: { type: String, required: true } }, opts)],
    education: [
      new Schema(
        {
          year: { type: String, required: true },
          title: { type: String, required: true },
          institution: String,
          location: String,
        },
        opts,
      ),
    ],
    experience: [
      new Schema(
        {
          period: { type: String, required: true },
          role: { type: String, required: true },
          organization: { type: String, required: true },
          location: String,
          category: { type: String, enum: [...EXPERIENCE_CATEGORIES], required: true },
          highlights: { type: [String], default: [] },
        },
        opts,
      ),
    ],
    achievements: [
      new Schema(
        { year: String, title: { type: String, required: true }, description: String },
        opts,
      ),
    ],
    philosophy: { type: String, maxlength: 3000 },
    skills: { type: [String], default: [] },
    affiliations: [new Schema({ name: { type: String, required: true }, since: String }, opts)],
    contact: {
      type: new Schema(
        {
          publicEmail: String,
          phone: String,
          showPhone: { type: Boolean, default: false, required: true },
          location: String,
        },
        opts,
      ),
      default: () => ({ showPhone: false }),
    },
    socials: [
      new Schema(
        {
          platform: { type: String, enum: [...SOCIAL_PLATFORMS], required: true },
          url: { type: String, required: true },
          label: String,
        },
        opts,
      ),
    ],
    portrait: imageSchema,
    heroDesktop: imageSchema,
    heroMobile: imageSchema,
    ogImage: imageSchema,
    seo: {
      type: new Schema({ metaTitle: String, metaDescription: String }, opts),
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export const ProfileModel = model<ProfileDoc>('Profile', profileSchema);
