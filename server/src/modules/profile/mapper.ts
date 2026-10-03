import type { ProfileAdminDto, ProfileDto, ProfileSummaryDto } from '@roman/shared';

import { toImageDto, type WithId } from '../../lib/mongo.js';
import type { ProfileDoc } from './model.js';

function toProfileBase(doc: WithId<ProfileDoc>): Omit<ProfileDto, 'contact'> {
  return {
    displayName: doc.displayName,
    tagline: doc.tagline,
    shortBio: doc.shortBio,
    biography: doc.biography.map((section) => ({ heading: section.heading, body: section.body })),
    education: doc.education.map((item) => ({
      year: item.year,
      title: item.title,
      institution: item.institution,
      location: item.location,
    })),
    experience: doc.experience.map((item) => ({
      period: item.period,
      role: item.role,
      organization: item.organization,
      location: item.location,
      category: item.category,
      highlights: [...item.highlights],
    })),
    achievements: doc.achievements.map((item) => ({
      year: item.year,
      title: item.title,
      description: item.description,
    })),
    philosophy: doc.philosophy,
    skills: [...doc.skills],
    affiliations: doc.affiliations.map((item) => ({ name: item.name, since: item.since })),
    socials: doc.socials.map((link) => ({
      platform: link.platform,
      url: link.url,
      label: link.label,
    })),
    portrait: toImageDto(doc.portrait),
    heroDesktop: toImageDto(doc.heroDesktop),
    heroMobile: toImageDto(doc.heroMobile),
    ogImage: toImageDto(doc.ogImage),
    seo: { metaTitle: doc.seo?.metaTitle, metaDescription: doc.seo?.metaDescription },
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Public profile: the phone number is withheld unless the owner chose to show it. */
export function toProfileDto(doc: WithId<ProfileDoc>): ProfileDto {
  return {
    ...toProfileBase(doc),
    contact: {
      publicEmail: doc.contact.publicEmail,
      phone: doc.contact.showPhone ? doc.contact.phone : undefined,
      location: doc.contact.location,
    },
  };
}

export function toProfileAdminDto(doc: WithId<ProfileDoc>): ProfileAdminDto {
  return {
    ...toProfileBase(doc),
    contact: {
      publicEmail: doc.contact.publicEmail,
      phone: doc.contact.phone,
      showPhone: doc.contact.showPhone,
      location: doc.contact.location,
    },
  };
}

export function toProfileSummaryDto(doc: WithId<ProfileDoc>): ProfileSummaryDto {
  return {
    displayName: doc.displayName,
    tagline: doc.tagline,
    shortBio: doc.shortBio,
    portrait: toImageDto(doc.portrait),
    heroDesktop: toImageDto(doc.heroDesktop),
    heroMobile: toImageDto(doc.heroMobile),
    ogImage: toImageDto(doc.ogImage),
    seo: { metaTitle: doc.seo?.metaTitle, metaDescription: doc.seo?.metaDescription },
  };
}
