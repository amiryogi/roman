import { z } from 'zod';

import { emailSchema, httpsUrlSchema, optionalText, text } from '../common.js';
import { experienceCategorySchema, socialPlatformSchema } from '../enums.js';
import { imageDtoSchema, imageInputSchema } from '../media.js';

// Nested items: the same schema validates admin input and API output.

export const biographySectionSchema = z.strictObject({
  heading: optionalText(120),
  body: text(5000),
});

export const educationItemSchema = z.strictObject({
  year: text(20),
  title: text(200),
  institution: optionalText(200),
  location: optionalText(120),
});

export const experienceItemSchema = z.strictObject({
  period: text(40),
  role: text(150),
  organization: text(200),
  location: optionalText(120),
  category: experienceCategorySchema,
  highlights: z.array(text(300)).max(10),
});

export const achievementItemSchema = z.strictObject({
  year: optionalText(20),
  title: text(200),
  description: optionalText(1000),
});

export const affiliationItemSchema = z.strictObject({
  name: text(200),
  since: optionalText(20),
});

export const socialLinkSchema = z.strictObject({
  platform: socialPlatformSchema,
  url: httpsUrlSchema,
  label: optionalText(60),
});

export const PHONE_PATTERN = /^[+()\d\s-]{6,30}$/;

export const profileSeoSchema = z.strictObject({
  metaTitle: optionalText(70),
  metaDescription: optionalText(170),
});

const profileTextFields = {
  displayName: text(80),
  tagline: text(120),
  shortBio: text(600),
  biography: z.array(biographySectionSchema).max(20),
  education: z.array(educationItemSchema).max(30),
  experience: z.array(experienceItemSchema).max(50),
  achievements: z.array(achievementItemSchema).max(50),
  philosophy: optionalText(3000),
  skills: z.array(text(80)).max(30),
  affiliations: z.array(affiliationItemSchema).max(20),
  socials: z.array(socialLinkSchema).max(10),
  seo: profileSeoSchema,
};

/** `PUT /api/admin/profile`: the full profile. Absent or null image slots mean "no image". */
export const profileInputSchema = z.strictObject({
  ...profileTextFields,
  contact: z.strictObject({
    publicEmail: z
      .union([z.literal(''), emailSchema])
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
    phone: z
      .union([z.literal(''), z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number')])
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
    showPhone: z.boolean(),
    location: optionalText(120),
  }),
  portrait: imageInputSchema.nullable().optional(),
  heroDesktop: imageInputSchema.nullable().optional(),
  heroMobile: imageInputSchema.nullable().optional(),
  ogImage: imageInputSchema.nullable().optional(),
});
export type ProfileInput = z.input<typeof profileInputSchema>;
export type ProfileInputParsed = z.output<typeof profileInputSchema>;

const profileImagesDto = {
  portrait: imageDtoSchema.optional(),
  heroDesktop: imageDtoSchema.optional(),
  heroMobile: imageDtoSchema.optional(),
  ogImage: imageDtoSchema.optional(),
};

/** Public profile. The phone number is only present when the owner chose to show it. */
export const profileDtoSchema = z.strictObject({
  ...profileTextFields,
  contact: z.strictObject({
    publicEmail: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  ...profileImagesDto,
  updatedAt: z.iso.datetime(),
});
export type ProfileDto = z.infer<typeof profileDtoSchema>;

/** Admin view of the profile: always includes the phone number and its visibility flag. */
export const profileAdminDtoSchema = profileDtoSchema.extend({
  contact: z.strictObject({
    publicEmail: z.string().optional(),
    phone: z.string().optional(),
    showPhone: z.boolean(),
    location: z.string().optional(),
  }),
});
export type ProfileAdminDto = z.infer<typeof profileAdminDtoSchema>;

/** The slice of the profile the home page needs, including its search title/description. */
export const profileSummaryDtoSchema = profileDtoSchema.pick({
  displayName: true,
  tagline: true,
  shortBio: true,
  portrait: true,
  heroDesktop: true,
  heroMobile: true,
  ogImage: true,
  seo: true,
});
export type ProfileSummaryDto = z.infer<typeof profileSummaryDtoSchema>;
