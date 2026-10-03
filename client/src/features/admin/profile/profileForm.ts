import type { Path } from 'react-hook-form';
import type { z } from 'zod';

import type {
  ImageDto,
  ImageInput,
  ProfileAdminDto,
  ProfileInput,
  profileInputSchema,
} from '@roman/shared';

export type ProfileParsed = z.output<typeof profileInputSchema>;

export const IMAGE_SLOTS = ['portrait', 'heroDesktop', 'heroMobile', 'ogImage'] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];

/** Server 422 paths mapped onto fields. Specific paths come before the lists that contain them. */
export const PROFILE_FIELDS: readonly Path<ProfileInput>[] = [
  'displayName',
  'tagline',
  'shortBio',
  'philosophy',
  'contact.publicEmail',
  'contact.phone',
  'contact.location',
  'seo.metaTitle',
  'seo.metaDescription',
  ...IMAGE_SLOTS.flatMap((slot) => [`${slot}.mediaRef` as const, `${slot}.alt` as const]),
  'biography',
  'education',
  'experience',
  'achievements',
  'skills',
  'affiliations',
  'socials',
];

/** "Keep the current image, maybe with new alt text", or no image. */
function slotValue(image: ImageDto | undefined): ImageInput | null {
  return image ? { alt: image.alt } : null;
}

/** The saved profile as form values. Absent optional text becomes '' so every input is controlled. */
export function toFormValues(profile: ProfileAdminDto): ProfileInput {
  return {
    displayName: profile.displayName,
    tagline: profile.tagline,
    shortBio: profile.shortBio,
    biography: profile.biography.map((section) => ({
      heading: section.heading ?? '',
      body: section.body,
    })),
    education: profile.education.map((item) => ({
      year: item.year,
      title: item.title,
      institution: item.institution ?? '',
      location: item.location ?? '',
    })),
    experience: profile.experience.map((item) => ({
      period: item.period,
      role: item.role,
      organization: item.organization,
      location: item.location ?? '',
      category: item.category,
      highlights: item.highlights,
    })),
    achievements: profile.achievements.map((item) => ({
      year: item.year ?? '',
      title: item.title,
      description: item.description ?? '',
    })),
    philosophy: profile.philosophy ?? '',
    skills: profile.skills,
    affiliations: profile.affiliations.map((item) => ({
      name: item.name,
      since: item.since ?? '',
    })),
    contact: {
      publicEmail: profile.contact.publicEmail ?? '',
      phone: profile.contact.phone ?? '',
      showPhone: profile.contact.showPhone,
      location: profile.contact.location ?? '',
    },
    socials: profile.socials.map((link) => ({
      platform: link.platform,
      url: link.url,
      label: link.label ?? '',
    })),
    seo: {
      metaTitle: profile.seo.metaTitle ?? '',
      metaDescription: profile.seo.metaDescription ?? '',
    },
    portrait: slotValue(profile.portrait),
    heroDesktop: slotValue(profile.heroDesktop),
    heroMobile: slotValue(profile.heroMobile),
    ogImage: slotValue(profile.ogImage),
  };
}

/** Starting point before the profile exists (normally `seed:content` creates it). */
export const EMPTY_PROFILE: ProfileInput = {
  displayName: '',
  tagline: '',
  shortBio: '',
  biography: [],
  education: [],
  experience: [],
  achievements: [],
  philosophy: '',
  skills: [],
  affiliations: [],
  contact: { publicEmail: '', phone: '', showPhone: false, location: '' },
  socials: [],
  seo: { metaTitle: '', metaDescription: '' },
  portrait: null,
  heroDesktop: null,
  heroMobile: null,
  ogImage: null,
};
