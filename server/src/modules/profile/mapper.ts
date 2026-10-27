import type { ProfileAdminDto, ProfileDto, ProfileSummaryDto } from '@roman/shared';

import { toImageDto, type WithId } from '../../lib/mongo.js';
import type { ProfileDoc } from './model.js';

type HomeContent = Pick<ProfileDto, 'heroHeadline' | 'heroIntro' | 'stats' | 'services'>;

/** Home page content. Profiles saved before these fields existed have none of them. */
function toHomeContent(doc: WithId<ProfileDoc>): HomeContent {
  return {
    heroHeadline: doc.heroHeadline,
    heroIntro: doc.heroIntro,
    stats: (doc.stats ?? []).map((stat) => ({ value: stat.value, label: stat.label })),
    services: (doc.services ?? []).map((service) => ({
      title: service.title,
      kicker: service.kicker,
      summary: service.summary,
      details: service.details.map((detail) => ({ label: detail.label, value: detail.value })),
      cta: service.cta && { label: service.cta.label, inquiryType: service.cta.inquiryType },
    })),
  };
}

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
    ...toHomeContent(doc),
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
    ...toHomeContent(doc),
  };
}
